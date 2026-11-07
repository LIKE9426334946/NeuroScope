import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import { buildGraph, describeGraph } from '../src/network/graph.js'

function validNode(graph, node) {
  const layer = graph.layers.find((item) => item.id === node?.layer)
  return layer && Number.isInteger(node.index) && node.index >= 0 && node.index < layer.count
}

function editorState(body) {
  const graph = buildGraph(body.network)
  const { visible, selected, direction } = body
  if (
    !graph.layers.some((layer) => layer.id === visible) ||
    !['self', 'upstream', 'downstream'].includes(direction)
  )
    throw new RangeError('观察层或方向无效。')
  if (selected === null) {
    if (direction !== 'self') throw new RangeError('请先选择神经元。')
  } else {
    if (!validNode(graph, selected)) throw new RangeError('选中的神经元已不存在。')
    const op =
      direction === 'upstream'
        ? graph.operations.find((op) => op.output.id === selected.layer)
        : graph.operations.find((op) => op.input.id === selected.layer)
    const target =
      direction === 'self' ? selected.layer : direction === 'upstream' ? op?.input.id : op?.output.id
    if (target !== visible) throw new RangeError('观察层与所选神经元的方向不匹配。')
  }
  return {
    network: describeGraph(graph),
    visible,
    selected: selected && { layer: selected.layer, index: selected.index },
    direction
  }
}

const sameShape = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((n, i) => n === b[i])
const nodeKey = (node) => node.layer + '/' + node.index

// The editor and pin list have independent writers. A pin change never replaces the editor's graph.
export function presentationRouter(preset, directory) {
  const file = join(directory, 'presentation.json')
  let current = {
    revision: 0,
    editorRevision: 0,
    ...editorState({ network: preset, visible: 1, selected: null, direction: 'self' }),
    pins: []
  }
  if (existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8'))
    const editor = editorState(saved)
    const graph = buildGraph(editor.network)
    if (
      !Number.isSafeInteger(saved.revision) ||
      !Number.isSafeInteger(saved.editorRevision) ||
      !Array.isArray(saved.pins) ||
      !saved.pins.every((node) => validNode(graph, node))
    ) {
      throw new Error('展示状态文件无效：' + file)
    }
    current = {
      revision: saved.revision,
      editorRevision: saved.editorRevision,
      ...editor,
      pins: saved.pins
    }
  }
  const listeners = new Set()
  function save(patch) {
    const next = { ...current, ...patch, revision: current.revision + 1 }
    const json = JSON.stringify(next)
    mkdirSync(directory, { recursive: true })
    writeFileSync(file + '.tmp', json)
    renameSync(file + '.tmp', file)
    current = next
    for (const response of listeners) response.write('data: ' + json + '\n\n')
  }

  const router = express.Router()
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  router.get('/', (_req, res) => res.json(current))
  router.get('/events', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache, no-transform'
    })
    res.flushHeaders()
    res.write('retry: 1200\ndata: ' + JSON.stringify(current) + '\n\n')
    listeners.add(res)
    const timer = setInterval(() => res.write(': heartbeat\n\n'), 15000)
    res.on('close', () => {
      clearInterval(timer)
      listeners.delete(res)
    })
  })
  router.use(express.json({ limit: '2mb' }))
  router.put('/', (req, res) => {
    const editor = editorState(req.body ?? {})
    const identical = Object.keys(editor).every(
      (key) => JSON.stringify(editor[key]) === JSON.stringify(current[key])
    )
    if (identical) return res.json(current)
    if (req.body.editorRevision !== current.editorRevision) return res.status(409).json(current)
    const compatible = new Set(
      editor.network.layers
        .filter((layer) =>
          sameShape(layer.shape, current.network.layers.find((old) => old.id === layer.id)?.shape)
        )
        .map((layer) => layer.id)
    )
    save({
      ...editor,
      editorRevision: current.editorRevision + 1,
      pins: current.pins.filter((node) => compatible.has(node.layer))
    })
    res.json(current)
  })
  router.post('/pins', (req, res) => {
    const { layer, shape, indices, pinned } = req.body ?? {}
    const tensor = current.network.layers.find((item) => item.id === layer)
    if (!sameShape(tensor?.shape, shape)) return res.status(409).json(current)
    const count = shape.reduce((a, b) => a * b, 1)
    if (
      typeof pinned !== 'boolean' ||
      !Array.isArray(indices) ||
      !indices.length ||
      !indices.every((i) => Number.isInteger(i) && i >= 0 && i < count)
    )
      throw new RangeError('神经元编号超出当前层的范围。')
    const nodes = new Map(current.pins.map((node) => [nodeKey(node), node]))
    for (const index of indices) {
      const node = { layer, index }
      if (pinned) nodes.set(nodeKey(node), node)
      else nodes.delete(nodeKey(node))
    }
    if (nodes.size !== current.pins.length) save({ pins: [...nodes.values()] })
    res.json(current)
  })
  router.use((error, _req, res, next) => {
    if (error instanceof RangeError || error.status === 400)
      return res.status(400).json({ detail: error.message })
    next(error)
  })
  return router
}
