import { createStore } from 'zustand/vanilla'
import configuration from '../../shared/network.json' with { type: 'json' }
import { buildGraph } from '../network/graph.js'
import { createConv2D } from '../operations/conv2d.js'
import type { Conv2DOptions, Direction, Graph, Layer, NodeRef, Shape } from '../types/network.ts'

export function adjacentLayer(layers: Layer[], anchor: number, direction: 'upstream' | 'downstream') {
  const index = layers.findIndex((layer) => layer.id === anchor)
  return index < 0 ? undefined : layers[index + (direction === 'upstream' ? -1 : 1)]
}

interface Explorer {
  graph: Graph
  visible: number
  selected: NodeRef | null
  direction: Direction
  view: (id: number) => void
  select: (index: number) => void
  explore: (direction: 'upstream' | 'downstream') => void
  clear: () => void
  reshapeInput: (shape: Shape) => void
  appendConv2D: (options: Conv2DOptions) => void
  removeLastOperation: () => void
}

const unselected = { selected: null, direction: 'self' } as const

export function createExplorer(graph = buildGraph(configuration)) {
  return createStore<Explorer>((set, get) => ({
    graph,
    visible: graph.layers[0].id,
    ...unselected,
    select(index) {
      const { visible, graph } = get()
      const count = graph.layers.find((layer) => layer.id === visible)!.count
      if (Number.isInteger(index) && index >= 0 && index < count) {
        set({ selected: { layer: visible, index }, direction: 'self' })
      }
    },
    explore(direction) {
      const { graph, selected } = get()
      if (!selected) return
      const next = adjacentLayer(graph.layers, selected.layer, direction)
      if (next) set({ visible: next.id, direction })
    },
    view(id) {
      const {
        graph: { layers },
        selected
      } = get()
      if (!layers.some((layer) => layer.id === id)) return
      if (selected?.layer === id) return set({ visible: id, direction: 'self' })
      for (const direction of ['upstream', 'downstream'] as const) {
        if (selected && adjacentLayer(layers, selected.layer, direction)?.id === id) {
          return set({ visible: id, direction })
        }
      }
      set({ visible: id, ...unselected })
    },
    clear() {
      set(unselected)
    },
    reshapeInput(shape) {
      const { graph } = get()
      // in_channels follows the preceding tensor; validate the entire chain before committing.
      const operations = graph.operations.map((op) => ({
        ...op.parameters,
        in_channels: undefined,
        type: op.type
      }))
      const next = buildGraph({ input_shape: shape, operations })
      set({ graph: next, visible: next.layers[0].id, ...unselected })
    },
    appendConv2D(options) {
      const { graph } = get()
      const op = createConv2D(graph.layers[graph.layers.length - 1], options)
      set({
        graph: { layers: [...graph.layers, op.output], operations: [...graph.operations, op] },
        visible: op.output.id,
        ...unselected
      })
    },
    removeLastOperation() {
      const { graph } = get()
      const last = graph.operations.at(-1)
      if (!last) return
      set({
        graph: { layers: graph.layers.slice(0, -1), operations: graph.operations.slice(0, -1) },
        visible: last.input.id,
        ...unselected
      })
    }
  }))
}
