import { createLayer, defaultLayers } from './layers'
import type { Layer } from '../types/network'

function readLayers(data: unknown): Layer[] {
  if (
    !data ||
    typeof data !== 'object' ||
    !('layers' in data) ||
    !Array.isArray(data.layers) ||
    !data.layers.length
  ) {
    throw new Error('无效的网络定义')
  }
  const ids = new Set<number>()
  return data.layers.map((item) => {
    if (!item || !Number.isSafeInteger(item.id) || item.id < 1 || ids.has(item.id))
      throw new Error('无效的层编号')
    ids.add(item.id)
    return createLayer(item.id, item.shape)
  })
}

export async function loadNetwork() {
  try {
    const response = await fetch('/api/network', { signal: AbortSignal.timeout(2500) })
    if (!response.ok) throw new Error('API ' + response.status)
    return { layers: readLayers(await response.json()), source: 'FastAPI 模拟网络' }
  } catch {
    return { layers: defaultLayers, source: '内置模拟网络' }
  }
}
