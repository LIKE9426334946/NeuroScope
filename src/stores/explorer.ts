import { createStore } from 'zustand/vanilla'
import { generateConnections, indexConnections, type Graph } from '../connections/graph.ts'
import { createLayer, defaultLayers } from '../network/layers.ts'
import type { Direction, Layer, NodeRef, Shape } from '../types/network.ts'

export function adjacentLayer(layers: Layer[], anchor: number, direction: 'upstream' | 'downstream') {
  const index = layers.findIndex((layer) => layer.id === anchor)
  return index < 0 ? undefined : layers[index + (direction === 'upstream' ? -1 : 1)]
}

interface Explorer {
  layers: Layer[]
  graph: Graph
  visible: number
  selected: NodeRef | null
  direction: Direction
  view: (id: number) => void
  select: (index: number) => void
  explore: (direction: 'upstream' | 'downstream') => void
  clear: () => void
  reshape: (shape: Shape) => void
}

export function createExplorer(layers = defaultLayers) {
  return createStore<Explorer>((set, get) => ({
    layers,
    graph: indexConnections(generateConnections(layers)),
    visible: layers[layers.length - 1].id,
    selected: null,
    direction: 'self',
    select(index) {
      const { visible, layers } = get()
      const count = layers.find((layer) => layer.id === visible)!.count
      if (Number.isInteger(index) && index >= 0 && index < count) {
        set({ selected: { layer: visible, index }, direction: 'self' })
      }
    },
    explore(direction) {
      const { layers, selected } = get()
      if (!selected) return
      const next = adjacentLayer(layers, selected.layer, direction)
      if (next) set({ visible: next.id, direction })
    },
    view(id) {
      const { layers, selected } = get()
      if (!layers.some((layer) => layer.id === id)) return
      if (selected?.layer === id) return set({ visible: id, direction: 'self' })
      for (const direction of ['upstream', 'downstream'] as const) {
        if (selected && adjacentLayer(layers, selected.layer, direction)?.id === id) {
          return set({ visible: id, direction })
        }
      }
      set({ visible: id, selected: null, direction: 'self' })
    },
    clear() {
      set({ selected: null, direction: 'self' })
    },
    reshape(shape) {
      const { visible, layers } = get()
      const changed = createLayer(visible, shape)
      const updated = layers.map((layer) => (layer.id === visible ? changed : layer))
      set({
        layers: updated,
        graph: indexConnections(generateConnections(updated)),
        selected: null,
        direction: 'self'
      })
    }
  }))
}
