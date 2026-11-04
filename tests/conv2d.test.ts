import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGraph, describeGraph } from '../src/network/graph.js'
import { checkedShape, elementCount } from '../src/tensor/indices.js'
import { createConv2D } from '../src/operations/conv2d.js'

function conv(shape: number[], overrides: Record<string, unknown> = {}) {
  const input = checkedShape(shape)
  return createConv2D(
    { id: 1, shape: input, count: elementCount(input) },
    { out_channels: 8, kernel_size: 3, ...overrides }
  )
}

test('3×5×5 → 8×3×3; central input reaches all 72 outputs, central output reads exactly 27 inputs', () => {
  const op = conv([3, 5, 5])
  assert.deepEqual(op.output.shape, [8, 3, 3])
  assert.deepEqual(
    op.getDownstreamNeurons(12),
    Array.from({ length: 72 }, (_, i) => i)
  )
  const window = [6, 7, 8, 11, 12, 13, 16, 17, 18]
  assert.deepEqual(
    op.getUpstreamNeurons(4),
    [0, 25, 50].flatMap((base) => window.map((i) => base + i))
  )
  assert.deepEqual(op.getDownstreamNeurons(0), [0, 9, 18, 27, 36, 45, 54, 63])
})

// Independent reference: slide the actual kernel taps across every output, then
// transpose that relation. It does not use the implementation's axis tables.
function verifyEveryNeuron(op: ReturnType<typeof conv>) {
  const p = op.parameters
  const [cin, h, w] = op.input.shape as [number, number, number]
  const [cout, oh, ow] = op.output.shape as [number, number, number]
  const reverse: number[][] = Array.from({ length: cin * h * w }, () => [])
  for (let co = 0; co < cout; co++)
    for (let oy = 0; oy < oh; oy++)
      for (let ox = 0; ox < ow; ox++) {
        const output = (co * oh + oy) * ow + ox
        const seen: number[] = []
        for (let ci = 0; ci < cin; ci++) {
          if (Math.floor(ci / (cin / p.groups)) !== Math.floor(co / (cout / p.groups))) continue
          for (let ky = 0; ky < p.kernel_size[0]; ky++)
            for (let kx = 0; kx < p.kernel_size[1]; kx++) {
              const y = oy * p.stride[0] + ky * p.dilation[0] - p.padding[0]
              const x = ox * p.stride[1] + kx * p.dilation[1] - p.padding[1]
              if (y >= 0 && y < h && x >= 0 && x < w) {
                const input = (ci * h + y) * w + x
                seen.push(input)
                reverse[input].push(output)
              }
            }
        }
        assert.deepEqual(op.getUpstreamNeurons(output), seen)
      }
  reverse.forEach((outputs, i) => assert.deepEqual(op.getDownstreamNeurons(i), outputs))
}

const cases = [
  { name: 'ordinary', input: [3, 5, 5], params: {}, expected: [8, 3, 3] },
  {
    name: 'rectangular kernel, stride, padding and dilation',
    input: [2, 5, 7],
    params: { out_channels: 3, kernel_size: [2, 3], stride: [2, 3], padding: [1, 2], dilation: [2, 1] },
    expected: [3, 3, 3]
  },
  {
    name: 'grouped',
    input: [4, 5, 6],
    params: { out_channels: 6, groups: 2, stride: 2, padding: 1 },
    expected: [6, 3, 3]
  },
  {
    name: 'depthwise with channel multiplier',
    input: [3, 4, 6],
    params: { groups: 3, out_channels: 6, kernel_size: [2, 2], dilation: [1, 2] },
    expected: [6, 3, 4]
  },
  {
    name: 'stride holes',
    input: [1, 4, 4],
    params: { out_channels: 1, kernel_size: 1, stride: 3 },
    expected: [1, 2, 2]
  },
  {
    name: 'windows entirely in padding',
    input: [1, 1, 1],
    params: { out_channels: 1, kernel_size: 1, padding: 2 },
    expected: [1, 5, 5]
  }
]
for (const { name, input, params, expected } of cases)
  test(name + ': all forward and inverse edges match a sliding kernel', () => {
    const op = conv(input, params)
    assert.deepEqual(op.output.shape, expected)
    verifyEveryNeuron(op)
  })

test('group and depthwise channel boundaries exclude other groups in both directions', () => {
  const grouped = conv([4, 1, 1], { out_channels: 6, groups: 2, kernel_size: 1 })
  assert.deepEqual(grouped.getUpstreamNeurons(3), [2, 3])
  assert.deepEqual(grouped.getDownstreamNeurons(1), [0, 1, 2])
  const depthwise = conv([3, 1, 1], { out_channels: 6, groups: 3, kernel_size: 1 })
  assert.deepEqual(depthwise.getDownstreamNeurons(1), [2, 3])
  assert.deepEqual(depthwise.getUpstreamNeurons(5), [2])
})

test('invalid ranks, channels, divisibility, dimensions, scalar/pair parameters and indices are rejected', () => {
  for (const shape of [[5], [4, 4]]) assert.throws(() => conv(shape), /三维/)
  for (const config of [
    { in_channels: 2 },
    { groups: 0 },
    { groups: 2 },
    { groups: 3 },
    { out_channels: 0 },
    { out_channels: 31 },
    { kernel_size: 6 },
    { stride: 0 },
    { padding: -1 },
    { dilation: 0 },
    { kernel_size: [1, 2, 3] },
    { dilation: [1, 0] },
    { stride: 1.5 },
    { padding: 20 },
    { kernel_size: '3' },
    { kernel_size: NaN },
    { padding: Number.MAX_SAFE_INTEGER },
    { kernel_size: 5, dilation: Number.MAX_SAFE_INTEGER }
  ]) {
    assert.throws(() => conv([3, 5, 5], config), RangeError)
  }
  const op = conv([3, 5, 5])
  for (const i of [-1, 72, 1.5]) assert.throws(() => op.getUpstreamNeurons(i), RangeError)
  assert.throws(() => op.getDownstreamNeurons(75), RangeError)
})

test('maximum dense shapes and even very large padded kernels stay queryable one node at a time', () => {
  const op = conv([30, 30, 30], { kernel_size: 31, padding: 15, out_channels: 30 })
  assert.deepEqual(op.output.shape, [30, 30, 30])
  assert.equal(op.getUpstreamNeurons((29 * 30 + 15) * 30 + 15).length, 27000)
  assert.equal(op.getDownstreamNeurons((29 * 30 + 15) * 30 + 15).length, 27000)
  const big = conv([1, 1, 1], { kernel_size: 1000001, padding: 500000, out_channels: 1 })
  assert.deepEqual(big.getUpstreamNeurons(0), [0])
})

test('a graph is built from its input and operations, including when a stale layers summary is present', () => {
  const spec = {
    input_shape: [3, 5, 5],
    operations: [
      { type: 'Conv2D', in_channels: 3, out_channels: 8, kernel_size: 3 },
      { type: 'Conv2D', out_channels: 4, kernel_size: 1, groups: 2 }
    ],
    layers: [{ id: 20, shape: [5] }]
  }
  const graph = buildGraph(spec)
  assert.deepEqual(
    graph.layers.map((l) => l.shape),
    [
      [3, 5, 5],
      [8, 3, 3],
      [4, 3, 3]
    ]
  )
  assert.equal(graph.operations[0].output, graph.operations[1].input)
  assert.deepEqual(describeGraph(buildGraph(describeGraph(graph))), describeGraph(graph))
  assert.throws(() => buildGraph({ ...spec, operations: [{ type: 'unknown' }] }))
  assert.deepEqual(
    buildGraph({
      layers: [
        { id: 1, shape: [5] },
        { id: 2, shape: [4, 4] }
      ]
    }).layers.map((l) => l.shape),
    [[5]]
  )
})
