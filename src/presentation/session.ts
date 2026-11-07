import { createStore } from 'zustand/vanilla'
import { loadNetwork } from '../network/bootstrap'
import { buildGraph, describeGraph } from '../network/graph.js'
import { createExplorer } from '../stores/explorer'
import type { Direction, NodeRef } from '../types/network'

interface Snapshot {
  revision: number
  editorRevision: number
  network: ReturnType<typeof describeGraph>
  visible: number
  selected: NodeRef | null
  direction: Direction
  pins: NodeRef[]
}
interface LiveState {
  pins: NodeRef[]
  source: string
  notice: string
  connected: boolean
}
const endpoint = '/api/presentation'

async function request(path: string, method = 'GET', payload?: unknown) {
  const response = await fetch(endpoint + path, {
    method,
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined
  })
  if (!response.ok && response.status !== 409) throw new Error('展示同步失败（' + response.status + '）')
  return { conflict: response.status === 409, snapshot: (await response.json()) as Snapshot }
}

export async function openPresentation(admin: boolean) {
  let latest: Snapshot | null = null
  try {
    latest = (await request('')).snapshot
  } catch {
    /* The embedded graph works offline. */
  }
  const initial = latest
    ? { graph: buildGraph(latest.network), source: '服务器计算图' }
    : await loadNetwork()
  const store = createExplorer(initial.graph)
  if (latest)
    store.setState({ visible: latest.visible, selected: latest.selected, direction: latest.direction })
  const live = createStore<LiveState>(() => ({
    pins: latest?.pins ?? [],
    source: initial.source,
    notice: latest ? '' : '本机预览',
    connected: Boolean(latest)
  }))
  let editorRevision = latest?.editorRevision ?? -1
  let applying = false
  let dirty = false
  let writing: Promise<void> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let pinsQueue: Promise<unknown> = Promise.resolve()
  let closed = false

  function restore(s: Snapshot) {
    const current = store.getState().graph
    // Preserve the scene and camera when only the active neuron or direction changed.
    const graph =
      JSON.stringify(describeGraph(current)) === JSON.stringify(s.network)
        ? current
        : buildGraph(s.network)
    applying = true
    try {
      store.setState({ graph, visible: s.visible, selected: s.selected, direction: s.direction })
    } finally {
      applying = false
    }
    editorRevision = s.editorRevision
  }

  function receive(s: Snapshot) {
    if (latest && s.revision < latest.revision) return
    const first = !latest
    latest = s
    const priorNotice = live.getState().notice
    live.setState({
      pins: s.pins,
      connected: true,
      source: '服务器计算图',
      notice: ['正在重连', '本机预览'].includes(priorNotice) ? '' : priorNotice
    })
    if (first) {
      if (dirty && s.editorRevision === 0) {
        editorRevision = 0
        void flush()
      } else {
        if (dirty) live.setState({ notice: '连接已恢复，已载入服务器保存的管理画面。' })
        dirty = false
        restore(s)
      }
    } else if (!dirty && !writing && editorRevision !== s.editorRevision) restore(s)
  }

  async function sendChanges() {
    while (dirty && latest) {
      dirty = false
      const { graph, visible, selected, direction } = store.getState()
      try {
        const result = await request('', 'PUT', {
          editorRevision,
          network: describeGraph(graph),
          visible,
          selected,
          direction
        })
        receive(result.snapshot)
        if (result.conflict) {
          dirty = false
          restore(latest)
          live.setState({ notice: '另一管理页已更新，已载入最新画面。' })
          return
        }
        editorRevision = result.snapshot.editorRevision
      } catch {
        dirty = true
        live.setState({ connected: false, notice: '等待重新同步' })
        retryTimer = setTimeout(() => {
          retryTimer = undefined
          void flush()
        }, 1800)
        return
      }
    }
    if (latest && latest.editorRevision !== editorRevision) restore(latest)
    live.setState({ notice: '' })
  }
  function flush(): Promise<void> {
    if (writing) return writing
    if (closed || !dirty || !latest || retryTimer) return Promise.resolve()
    writing = Promise.resolve()
      .then(sendChanges)
      .finally(() => {
        writing = null
        if (dirty && !retryTimer) void flush()
      })
    return writing
  }

  const unsubscribe = admin
    ? store.subscribe((next, prev) => {
        if (applying) return
        if (next.graph !== prev.graph) {
          const unchanged = new Set(
            next.graph.layers
              .filter(
                (layer) =>
                  prev.graph.layers.find((old) => old.id === layer.id)?.shape.join(',') ===
                  layer.shape.join(',')
              )
              .map((layer) => layer.id)
          )
          live.setState({ pins: live.getState().pins.filter((node) => unchanged.has(node.layer)) })
        }
        dirty = true
        live.setState({ notice: latest ? '正在同步' : '本机预览' })
        void flush()
      })
    : () => {}

  function setPins(layer: number, indices: number[], pinned: boolean): Promise<boolean> {
    const tensor = store.getState().graph.layers.find((item) => item.id === layer)
    if (
      !tensor ||
      !indices.length ||
      !indices.every((i) => Number.isInteger(i) && i >= 0 && i < tensor.count)
    )
      return Promise.resolve(false)
    const save = async () => {
      if (!latest) {
        const others = live
          .getState()
          .pins.filter((node) => node.layer !== layer || !indices.includes(node.index))
        live.setState({
          pins: pinned ? [...others, ...indices.map((index) => ({ layer, index }))] : others
        })
        return true
      }
      try {
        await flush()
        if (dirty) throw new Error('图尚未同步')
        const fixed = new Set(
          latest.pins.filter((node) => node.layer === layer).map((node) => node.index)
        )
        const sameLayer =
          latest.network.layers.find((item) => item.id === layer)?.shape.join(',') ===
          tensor.shape.join(',')
        if (sameLayer && indices.every((index) => fixed.has(index) === pinned)) return true
        const result = await request('/pins', 'POST', { layer, shape: tensor.shape, indices, pinned })
        receive(result.snapshot)
        live.setState({ notice: result.conflict ? '该层已改变，请重新选择。' : '' })
        return !result.conflict
      } catch {
        live.setState({ notice: '神经元未同步，请重试。' })
        return false
      }
    }
    const next = pinsQueue.then(save)
    pinsQueue = next
    return next
  }

  let stream: EventSource
  let reconnect: ReturnType<typeof setTimeout> | undefined
  function connect() {
    if (closed) return
    stream = new EventSource(endpoint + '/events')
    stream.onmessage = (event) => receive(JSON.parse(event.data))
    stream.onerror = () => {
      live.setState({ connected: false, notice: latest ? '正在重连' : '本机预览' })
      // A failed HTTP handshake can close EventSource permanently instead of retrying.
      if (stream.readyState === EventSource.CLOSED && !closed) reconnect = setTimeout(connect, 1800)
    }
  }
  connect()
  function close() {
    closed = true
    stream.close()
    unsubscribe()
    clearTimeout(retryTimer)
    clearTimeout(reconnect)
  }
  return { store, live, setPins, close }
}
export type Presentation = Awaited<ReturnType<typeof openPresentation>>
