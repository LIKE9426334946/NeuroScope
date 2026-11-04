import configuration from '../../shared/network.json' with { type: 'json' }
import { buildGraph } from './graph.js'

export async function loadNetwork() {
  try {
    const response = await fetch('/api/network', { signal: AbortSignal.timeout(2500) })
    if (!response.ok) throw new Error('API ' + response.status)
    return { graph: buildGraph(await response.json()), source: '服务器计算图' }
  } catch {
    return { graph: buildGraph(configuration), source: '内置计算图' }
  }
}
