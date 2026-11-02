import configuration from '../../shared/network.json' with { type: 'json' }
import { checkedShape, elementCount } from '../tensor/layout.ts'
import type { Layer } from '../types/network.ts'

export function createLayer(id: number, value: unknown): Layer {
  const shape = checkedShape(value)
  return { id, shape, count: elementCount(shape) }
}

export const defaultLayers = configuration.layers.map((layer) => createLayer(layer.id, layer.shape))
export const layerName = (id: number) => 'Layer ' + String(id).padStart(2, '0')
export const rankName = (rank: number) => ['一维向量', '二维矩阵', '三维张量'][rank - 1]
