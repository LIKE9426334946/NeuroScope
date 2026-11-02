import type { Position, Shape } from '../types/network.ts'

export const MAX_DIMENSION = 30
export const SPACING = 1.35

export function checkedShape(value: unknown): Shape {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3
      || !Array.from(value).every(n => Number.isInteger(n) && n >= 1 && n <= MAX_DIMENSION)) {
    throw new RangeError('请输入 1 至 3 个维度，每个维度必须是 1 至 30 的整数。')
  }
  return [...value] as Shape
}

export function parseShape(text: string): Shape {
  const cleaned = text.trim().replace(/^\[([^\[\]]*)\]$/, '$1').trim()
  if (!/^\d+(?:\s*[,，x×]\s*\d+)*$/i.test(cleaned)) {
    throw new RangeError('用逗号分隔维度，例如 3, 4, 5。')
  }
  return checkedShape(cleaned.split(/[,，x×]/i).map(Number))
}
export const formatShape = (shape: Shape) => '[' + shape.join(', ') + ']'
export const elementCount = (shape: Shape) => shape.reduce((total, dim) => total * dim, 1)

/** Row-major order, last dimension changes fastest (as in contiguous PyTorch tensors). */
export function indexToCoords(shape: Shape, index: number): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= elementCount(shape)) throw new RangeError('神经元编号越界')
  let rest = index
  const coords = Array<number>(shape.length)
  for (let axis = shape.length - 1; axis >= 0; axis--) {
    coords[axis] = rest % shape[axis]
    rest = Math.floor(rest / shape[axis])
  }
  return coords
}

export function coordsToIndex(shape: Shape, coords: number[]): number {
  if (coords.length !== shape.length || coords.some((v, axis) => !Number.isInteger(v) || v < 0 || v >= shape[axis])) {
    throw new RangeError('Tensor 坐标越界')
  }
  return coords.reduce((flat, value, axis) => flat * shape[axis] + value, 0)
}

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
