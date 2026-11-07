import assert from 'node:assert/strict'
import test from 'node:test'
import { neighbours, neuronRelation } from '../src/connections/graph.ts'
import { buildGraph } from '../src/network/graph.js'
import { nodeTone } from '../src/neuron/appearance.ts'
import { createExplorer } from '../src/stores/explorer.ts'

test('Layer 02 #65 has exactly the 27 inputs in its receptive field on Layer 01', () => {
  const graph = buildGraph({
    input_shape: [3, 10, 10],
    operations: [{ type: 'Conv2D', out_channels: 2, kernel_size: 3 }]
  })
  const store = createExplorer(graph)
  store.getState().view(2)
  store.getState().select(65)
  const { selected, visible, direction } = store.getState()
  assert.equal(visible, 2)
  assert.equal(direction, 'self')
  const expected = [0, 100, 200].flatMap((offset) =>
    [1, 2, 3, 11, 12, 13, 21, 22, 23].map((i) => offset + i)
  )
  assert.deepEqual(neuronRelation(graph, selected, 'upstream'), { layer: 1, indices: expected })
  assert.equal(neuronRelation(graph, { layer: 1, index: 65 }, 'upstream'), null)
  assert.equal(neuronRelation(graph, null, 'upstream'), null)
})

test('direction changes from a middle tensor retain the same selected neuron and query the correct operation', () => {
  const store = createExplorer()
  const s = () => store.getState()
  s().appendConv2D({ out_channels: 4, kernel_size: 1, groups: 2 })
  const graph = s().graph
  s().view(2)
  s().select(4)
  const anchor = s().selected
  s().explore('upstream')
  assert.equal(s().visible, 1)
  assert.equal(s().selected, anchor)
  const upstream = new Set(neighbours(graph, anchor, 'upstream'))
  for (let i = 0; i < 75; i++) {
    const y = Math.floor((i % 25) / 5),
      x = i % 5
    assert.equal(
      nodeTone(i, null, upstream),
      y >= 1 && y <= 3 && x >= 1 && x <= 3 ? 'related' : 'normal'
    )
  }
  s().explore('downstream')
  assert.equal(s().visible, 3)
  assert.equal(s().selected, anchor)
  assert.deepEqual(neighbours(graph, anchor, 'downstream'), [4, 13])
  s().view(2)
  assert.equal(s().direction, 'self')
  assert.equal(nodeTone(4, s().selected!.index, new Set()), 'selected')
  s().select(70)
  s().explore('downstream')
  assert.deepEqual(neighbours(graph, s().selected, 'downstream'), [25, 34])
  s().select(34)
  assert.deepEqual(s().selected, { layer: 3, index: 34 })
  s().explore('downstream')
  assert.equal(s().direction, 'self')
  s().view(1)
  assert.equal(s().selected, null)
  s().select(0)
  s().explore('upstream')
  assert.equal(s().visible, 1)
  s().clear()
  assert.equal(s().graph, graph)
  assert.deepEqual(neighbours(graph, s().selected, 'upstream'), [])
})

test('reshape only edits the input and recomputes every derived tensor, with atomic rollback on a late invalid output', () => {
  const store = createExplorer()
  const s = () => store.getState()
  s().appendConv2D({ out_channels: 2, kernel_size: 3 })
  s().reshapeInput([6, 7, 6])
  assert.deepEqual(
    s().graph.layers.map((l) => l.shape),
    [
      [6, 7, 6],
      [8, 5, 4],
      [2, 3, 2]
    ]
  )
  assert.deepEqual(
    s().graph.operations.map((op) => op.parameters.in_channels),
    [6, 8]
  )
  s().view(2)
  s().select(4)
  s().explore('upstream')
  const before = s()
  assert.throws(() => s().reshapeInput([3, 4, 4]), /Layer 3/)
  assert.equal(s(), before)
  assert.throws(() => s().appendConv2D({ out_channels: 3, kernel_size: 1, groups: 2 }))
  assert.equal(s(), before)
  s().removeLastOperation()
  assert.equal(s().visible, 2)
  assert.equal(s().selected, null)
  s().removeLastOperation()
  s().reshapeInput([4, 5])
  assert.deepEqual(
    s().graph.layers.map((l) => l.shape),
    [[4, 5]]
  )
  assert.throws(() => s().appendConv2D({ out_channels: 1, kernel_size: 1 }), /三维/)
  s().reshapeInput([5])
  s().select(4)
  s().select(5)
  s().select(-1)
  s().select(1.1)
  s().removeLastOperation()
  assert.deepEqual(s().selected, { layer: 1, index: 4 })
})

test('zero neighbours from an uncovered input stay white when browsing its neighbouring layer', () => {
  const store = createExplorer(buildGraph({ input_shape: [1, 3, 3], operations: [] }))
  const s = () => store.getState()
  s().appendConv2D({ out_channels: 1, kernel_size: 1, stride: 2 })
  s().view(1)
  s().select(4)
  s().explore('downstream')
  assert.equal(s().visible, 2)
  assert.deepEqual(neighbours(s().graph, s().selected, 'downstream'), [])
  assert.equal(nodeTone(0, null, new Set()), 'normal')
})
