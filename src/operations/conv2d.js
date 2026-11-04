// @ts-check
import { coordsToIndex, elementCount, indexToCoords, MAX_DIMENSION } from '../tensor/indices.js'

/** @typedef {import('../types/network.ts').Pair} Pair */
/** @typedef {import('../types/network.ts').Layer} Layer */
/** @typedef {import('../types/network.ts').Operation} Operation */

/** @param {unknown} value @param {string} name @param {number} minimum */
function integer(value, name, minimum) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于或等于 ${minimum} 的安全整数。`)
  }
  return value
}

/** A scalar applies to both axes; a pair is [height, width]. @param {unknown} value @param {string} name @param {number} min @returns {Pair} */
function spatialPair(value, name, min) {
  const values = Array.isArray(value) ? value : [value, value]
  if (values.length !== 2) throw new RangeError(name + ' 需要一个整数或两个整数（高、宽）。')
  return [integer(values[0], name, min), integer(values[1], name, min)]
}

/** @param {number} size @param {number} kernel @param {number} stride @param {number} pad @param {number} dilation @param {string} axis */
function spatialAxis(size, kernel, stride, pad, dilation, axis) {
  const effective = dilation * (kernel - 1) + 1
  const padded = size + 2 * pad
  if (!Number.isSafeInteger(effective) || !Number.isSafeInteger(padded))
    throw new RangeError('卷积参数超过安全整数范围。')
  const output = Math.floor((padded - effective) / stride) + 1
  if (output < 1 || output > MAX_DIMENSION) {
    throw new RangeError(`输出${axis}为 ${output}，必须在 1–${MAX_DIMENSION} 之间。`)
  }

  // Visit at most 30 × 30 real coordinates per axis, even with a large padded kernel.
  // Both lookup tables are populated by the same valid tap: i = o*s - p + k*d.
  /** @type {number[][]} */
  const inputs = Array.from({ length: output }, () => [])
  /** @type {number[][]} */
  const outputs = Array.from({ length: size }, () => [])
  for (let o = 0; o < output; o++) {
    const start = o * stride - pad
    for (let i = 0; i < size; i++) {
      const offset = i - start
      if (offset >= 0 && offset < effective && offset % dilation === 0) {
        inputs[o].push(i)
        outputs[i].push(o)
      }
    }
  }
  return { output, inputs, outputs }
}

/** @param {Layer} layer @param {number} group @param {number} channels @param {number[]} rows @param {number[]} cols */
function indicesInGroup(layer, group, channels, rows, cols) {
  const result = []
  const first = group * channels
  for (let c = first; c < first + channels; c++) {
    for (const y of rows) {
      for (const x of cols) result.push(coordsToIndex(layer.shape, [c, y, x]))
    }
  }
  return result
}

/** Create one convolution and its exact (zero-padded) structural dependencies.
 * @param {Layer} input @param {Record<string, unknown>} options @returns {Operation}
 */
export function createConv2D(input, options) {
  if (input.shape.length !== 3) throw new RangeError('Conv2D 需要三维输入 [C, H, W]。')
  const [channels, height, width] = input.shape
  const {
    in_channels = channels,
    out_channels,
    kernel_size,
    stride = 1,
    padding = 0,
    dilation = 1,
    groups = 1
  } = options
  if (integer(in_channels, 'in_channels', 1) !== channels) {
    throw new RangeError(`in_channels 必须等于输入通道数 ${channels}。`)
  }
  const out = integer(out_channels, 'out_channels', 1)
  if (out > MAX_DIMENSION) throw new RangeError(`out_channels 不能超过 ${MAX_DIMENSION}。`)
  const groupCount = integer(groups, 'groups', 1)
  if (channels % groupCount !== 0 || out % groupCount !== 0) {
    throw new RangeError('groups 必须同时整除输入和输出通道数。')
  }
  const kernel = spatialPair(kernel_size, 'kernel_size', 1)
  const step = spatialPair(stride, 'stride', 1)
  const pad = spatialPair(padding, 'padding', 0)
  const dil = spatialPair(dilation, 'dilation', 1)
  const y = spatialAxis(height, kernel[0], step[0], pad[0], dil[0], '高度')
  const x = spatialAxis(width, kernel[1], step[1], pad[1], dil[1], '宽度')
  /** @type {[number, number, number]} */
  const shape = [out, y.output, x.output]
  const output = { id: input.id + 1, shape, count: elementCount(shape) }
  const inPerGroup = channels / groupCount
  const outPerGroup = out / groupCount
  return {
    type: 'Conv2D',
    input,
    output,
    parameters: {
      in_channels: channels,
      out_channels: out,
      kernel_size: kernel,
      stride: step,
      padding: pad,
      dilation: dil,
      groups: groupCount
    },
    getUpstreamNeurons(index) {
      const [co, oy, ox] = indexToCoords(shape, index)
      return indicesInGroup(input, Math.floor(co / outPerGroup), inPerGroup, y.inputs[oy], x.inputs[ox])
    },
    getDownstreamNeurons(index) {
      const [ci, iy, ix] = indexToCoords(input.shape, index)
      return indicesInGroup(
        output,
        Math.floor(ci / inPerGroup),
        outPerGroup,
        y.outputs[iy],
        x.outputs[ix]
      )
    }
  }
}
