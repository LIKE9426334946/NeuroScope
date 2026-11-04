import type { Graph, NodeRef } from '../types/network.ts'

const EMPTY: readonly number[] = []

export function neighbours(
  graph: Graph,
  node: NodeRef | null,
  direction: 'upstream' | 'downstream'
): readonly number[] {
  if (!node) return EMPTY
  if (direction === 'upstream') {
    const op = graph.operations.find((op) => op.output.id === node.layer)
    return op?.getUpstreamNeurons(node.index) ?? EMPTY
  }
  const op = graph.operations.find((op) => op.input.id === node.layer)
  return op?.getDownstreamNeurons(node.index) ?? EMPTY
}
