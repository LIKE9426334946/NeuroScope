// @ts-check
/** @typedef {import('../types/network.ts').Shape} Shape */
export const MAX_DIMENSION = 30

/** @param {unknown} value @returns {Shape} */
export function checkedShape(value) {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 3 ||
    !Array.from(value).every((n) => Number.isInteger(n) && n >= 1 && n <= MAX_DIMENSION)
  ) {
    throw new RangeError('请输入 1 至 3 个维度，每个维度必须是 1 至 30 的整数。')
  }
  return /** @type {Shape} */ ([...value])
}

/** @param {Shape} shape */
export const elementCount = (shape) => shape.reduce((total, dim) => total * dim, 1)

/** Row-major: the last dimension changes fastest. @param {Shape} shape @param {number} index */
export function indexToCoords(shape, index) {
  if (!Number.isInteger(index) || index < 0 || index >= elementCount(shape))
    throw new RangeError('神经元编号越界')
  const coords = Array(shape.length)
  for (let axis = shape.length - 1; axis >= 0; axis--) {
    coords[axis] = index % shape[axis]
    index = Math.floor(index / shape[axis])
  }
  return /** @type {number[]} */ (coords)
}

/** @param {Shape} shape @param {number[]} coords */
export function coordsToIndex(shape, coords) {
  if (
    coords.length !== shape.length ||
    coords.some((v, axis) => !Number.isInteger(v) || v < 0 || v >= shape[axis])
  ) {
    throw new RangeError('Tensor 坐标越界')
  }
  return coords.reduce((flat, value, axis) => flat * shape[axis] + value, 0)
}
