import assert from 'node:assert/strict'
import test from 'node:test'
import { checkedShape, coordsToIndex, elementCount, indexToCoords, parseShape, positionsFor } from '../src/tensor/layout.ts'

test('rank 1, 2, 3 layouts match row-major coordinates and element counts', () => {
  for (const dimensions of [[5], [4, 5], [3, 4, 5], [1, 1, 1], [30, 30, 30]]) {
    const shape = checkedShape(dimensions)
    const positions = positionsFor(shape)
    assert.equal(positions.length, elementCount(shape))
    assert.equal(new Set(positions.map(p => p.join(','))).size, positions.length)
    positions.forEach((_, id) => assert.equal(coordsToIndex(shape, indexToCoords(shape, id)), id))
  }
  const grid = positionsFor([3, 4, 5])
  assert.equal(grid.length, 60)
  assert.deepEqual(indexToCoords([3, 4, 5], 47), [2, 1, 2])
  assert.ok(grid[1][0] > grid[0][0] && grid[5][1] < grid[0][1] && grid[20][2] > grid[0][2])
  assert.deepEqual(positionsFor([1]), [[0, 0, 0]])
})
test('shape inputs reject invalid ranks, dimensions and out-of-range indices', () => {
  for (const value of [null, [], [0], [31], [-1], [1.2], [1, 2, 3, 4], ['4'], [NaN]]) assert.throws(() => checkedShape(value))
  for (const text of ['', '3,', '[3, 4', '2.5', '1e1', '4,,5']) assert.throws(() => parseShape(text))
  for (const text of ['[3, 4, 5]', '3×4×5', '3，4，5']) assert.deepEqual(parseShape(text), [3, 4, 5])
  assert.throws(() => indexToCoords([5], 5))
  assert.throws(() => coordsToIndex([4, 5], [4, 0]))
})
