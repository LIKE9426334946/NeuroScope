import type { Position, Shape } from '../types/network.ts'
import { checkedShape, elementCount, indexToCoords } from './indices.js'

export { checkedShape, elementCount, indexToCoords, coordsToIndex, MAX_DIMENSION } from './indices.js'
export const SPACING = 1.35

export function parseShape(text: string): Shape {
  const cleaned = text
    .trim()
    .replace(/^\[([^\[\]]*)\]$/, '$1')
    .trim()
  if (!/^\d+(?:\s*[,，x×]\s*\d+)*$/i.test(cleaned)) {
    throw new RangeError('用逗号分隔维度，例如 3, 4, 5。')
  }
  return checkedShape(cleaned.split(/[,，x×]/i).map(Number))
}
export const formatShape = (shape: Shape) => '[' + shape.join(', ') + ']'

export function positionsFor(shape: Shape): Position[] {
  return Array.from({ length: elementCount(shape) }, (_, index) => {
    const c = indexToCoords(shape, index)
    const last = shape.length - 1
    const x = (c[last] - (shape[last] - 1) / 2) * SPACING
    const y = last >= 1 ? ((shape[last - 1] - 1) / 2 - c[last - 1]) * SPACING : 0
    const z = last === 2 ? (c[0] - (shape[0] - 1) / 2) * SPACING : 0
    return [x, y, z]
  })
}
