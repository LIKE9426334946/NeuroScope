import type { Graph, NodeRef } from '../types/network.ts'

const EMPTY: readonly number[] = []

export function neuronRelation(
  graph: Graph,
  node: NodeRef | null,
  direction: 'upstream' | 'downstream'
): { layer: number; indices: readonly number[] } | null {
  if (!node) return null
  if (direction === 'upstream') {
    const op = graph.operations.find((op) => op.output.id === node.layer)
    return op ? { layer: op.input.id, indices: op.getUpstreamNeurons(node.index) } : null
  }
  const op = graph.operations.find((op) => op.input.id === node.layer)
  return op ? { layer: op.output.id, indices: op.getDownstreamNeurons(node.index) } : null
}

export function neighbours(
  graph: Graph,
  node: NodeRef | null,
  direction: 'upstream' | 'downstream'
): readonly number[] {
  return neuronRelation(graph, node, direction)?.indices ?? EMPTY
}
