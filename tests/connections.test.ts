import assert from 'node:assert/strict'
import test from 'node:test'
import { generateConnections, indexConnections, neighbours } from '../src/connections/graph.ts'
import { createLayer, defaultLayers } from '../src/network/layers.ts'
import { nodeTone } from '../src/neuron/appearance.ts'
import { createExplorer } from '../src/stores/explorer.ts'

test('all default adjacency queries and node colours agree with explicit edge records', () => {
  const edges = generateConnections(defaultLayers)
  assert.deepEqual(generateConnections(defaultLayers), edges)
  assert.equal(new Set(edges.map(e => JSON.stringify(e))).size, edges.length)
  const graph = indexConnections(edges)
  for (const layer of defaultLayers) {
    for (let id = 0; id < layer.count; id++) {
      const node = { layer: layer.id, index: id }
      const sources = edges.filter(e => e.target_layer === layer.id && e.target_neuron_index === id).map(e => e.source_neuron_index)
      const targets = edges.filter(e => e.source_layer === layer.id && e.source_neuron_index === id).map(e => e.target_neuron_index)
      for (const [direction, expected, adjacent] of [['upstream', sources, layer.id - 1], ['downstream', targets, layer.id + 1]] as const) {
        const actual = neighbours(graph, node, direction)
        assert.deepEqual(actual, expected)
        const count = defaultLayers.find(l => l.id === adjacent)?.count ?? 0
        const related = new Set(actual)
        for (let i = 0; i < count; i++) assert.equal(nodeTone(i, null, related), expected.includes(i) ? 'related' : 'normal')
      }
      assert.equal(nodeTone(id, id, new Set()), 'selected')
    }
  }
})

test('navigation uses the original anchor, never mutates edges, and recalculates after reselection', () => {
  const store = createExplorer()
  const state = () => store.getState()
  const originalGraph = state().graph
  assert.equal(state().selected, null)
  state().explore('upstream')
  assert.equal(state().visible, 3)
  state().view(2)
  state().select(5)
  const anchor = state().selected
  state().explore('upstream')
  assert.equal(state().visible, 1)
  assert.equal(state().selected, anchor)
  assert.deepEqual(neighbours(state().graph, anchor, state().direction), [1, 0, 3])
  state().explore('downstream')
  assert.equal(state().visible, 3)
  assert.equal(state().selected, anchor)
  assert.deepEqual(neighbours(state().graph, anchor, state().direction), [8, 9, 10, 11])
  state().view(2)
  assert.equal(state().direction, 'self')
  assert.equal(state().selected, anchor)
  state().select(6)
  state().explore('upstream')
  assert.notDeepEqual(neighbours(state().graph, state().selected, state().direction), [1, 0, 3])
  state().select(1)
  assert.deepEqual(state().selected, { layer: 1, index: 1 })
  assert.equal(state().direction, 'self')
  state().explore('upstream')
  assert.equal(state().visible, 1)
  state().view(3)
  assert.equal(state().selected, null)
  state().select(26)
  state().explore('downstream')
  assert.equal(state().visible, 3)
  state().clear()
  assert.equal(state().selected, null)
  assert.equal(state().graph, originalGraph)
})

test('zero neighbours, singleton layers and invalid selections remain consistent', () => {
  const layers = [createLayer(1, [30]), createLayer(2, [1]), createLayer(3, [1])]
  const store = createExplorer(layers)
  const state = () => store.getState()
  state().view(1)
  state().select(29)
  state().explore('downstream')
  assert.equal(state().visible, 2)
  assert.deepEqual(neighbours(state().graph, state().selected, 'downstream'), [])
  state().view(1)
  state().select(30)
  state().select(-1)
  state().select(0.5)
  assert.deepEqual(state().selected, { layer: 1, index: 29 })
  state().reshape([1])
  assert.equal(state().selected, null)
  assert.equal(state().graph.connections.length, 2)
  state().view(2)
  state().select(0)
  state().explore('upstream')
  assert.deepEqual(neighbours(state().graph, state().selected, 'upstream'), [0])
})

test('three full 30³ tensors keep connections sparse and all endpoints in range', () => {
  const layers = [1, 2, 3].map(id => createLayer(id, [30, 30, 30]))
  const graph = indexConnections(generateConnections(layers))
  assert.ok(graph.connections.length <= 2 * 27_000 * 3)
  for (const edge of graph.connections) {
    assert.equal(edge.target_layer, edge.source_layer + 1)
    assert.ok(edge.source_neuron_index >= 0 && edge.source_neuron_index < 27_000)
    assert.ok(edge.target_neuron_index >= 0 && edge.target_neuron_index < 27_000)
  }
  assert.ok(neighbours(graph, { layer: 3, index: 26_999 }, 'upstream').length > 0)
})
