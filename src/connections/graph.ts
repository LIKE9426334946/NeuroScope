import type { Connection, Direction, Layer, NodeRef } from '../types/network.ts'

/** Stable, sparse mock topology. No rendering or world coordinates are used. */
export function generateConnections(layers: Layer[]): Connection[] {
  const edges: Connection[] = []
  for (let i = 1; i < layers.length; i++) {
    const source = layers[i - 1]
    const target = layers[i]
    for (let t = 0; t < target.count; t++) {
      const center = Math.floor(t * source.count / target.count)
      const indexes = new Set([center, (center + (t % 2 ? -1 : 1) + source.count) % source.count])
      if (source.count >= 4 && t % 5 === 0) indexes.add((center + 2) % source.count)
      for (const s of indexes) edges.push({
        source_layer: source.id, source_neuron_index: s,
        target_layer: target.id, target_neuron_index: t,
      })
    }
  }
  return edges
}

type Adjacency = Map<string, number[]>
const key = (layer: number, index: number) => layer + '/' + index
function append(map: Adjacency, id: string, index: number) {
  const row = map.get(id)
  if (row) row.push(index)
  else map.set(id, [index])
}

export function indexConnections(connections: Connection[]) {
  const upstream: Adjacency = new Map()
  const downstream: Adjacency = new Map()
  for (const edge of connections) {
    append(upstream, key(edge.target_layer, edge.target_neuron_index), edge.source_neuron_index)
    append(downstream, key(edge.source_layer, edge.source_neuron_index), edge.target_neuron_index)
  }
  return { connections, upstream, downstream }
}
export type Graph = ReturnType<typeof indexConnections>

const EMPTY: readonly number[] = []
export function neighbours(graph: Graph, node: NodeRef | null, direction: Direction): readonly number[] {
  return !node || direction === 'self' ? EMPTY : graph[direction].get(key(node.layer, node.index)) ?? EMPTY
}
