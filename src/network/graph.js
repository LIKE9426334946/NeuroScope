// @ts-check
import { createConv2D } from '../operations/conv2d.js'
import { checkedShape, elementCount } from '../tensor/indices.js'

/** @typedef {import('../types/network.ts').Graph} Graph */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Only the input has an authored shape. Each operation consumes the preceding tensor.
 * @param {unknown} definition @returns {Graph}
 */
export function buildGraph(definition) {
  if (!record(definition)) throw new RangeError('无效的计算图定义。')
  let { input_shape, operations } = definition
  // Old local presets have no operation semantics. Keep only their input tensor.
  if (input_shape === undefined && operations === undefined && Array.isArray(definition.layers)) {
    input_shape = definition.layers[0]?.shape
    operations = []
  }
  const shape = checkedShape(input_shape)
  if (!Array.isArray(operations)) throw new RangeError('计算图需要有序的 operations 数组。')
  const input = { id: 1, shape, count: elementCount(shape) }
  /** @type {Graph} */
  const graph = { layers: [input], operations: [] }
  for (const spec of operations) {
    if (!record(spec) || spec.type !== 'Conv2D') throw new RangeError('仅支持 Conv2D 运算。')
    const from = graph.layers[graph.layers.length - 1]
    try {
      const op = createConv2D(from, spec)
      graph.operations.push(op)
      graph.layers.push(op.output)
    } catch (error) {
      throw new RangeError(
        `Layer ${from.id + 1} 的 Conv2D 无效。${error instanceof Error ? error.message : error}`
      )
    }
  }
  return graph
}

/** Reusable API definition; the layers field is a derived summary for existing readers. @param {Graph} graph */
export function describeGraph(graph) {
  return {
    input_shape: graph.layers[0].shape,
    operations: graph.operations.map((op) => ({ type: op.type, ...op.parameters })),
    layers: graph.layers.map(({ id, shape }) => ({ id, shape }))
  }
}
