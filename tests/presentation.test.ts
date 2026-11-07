import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { once } from 'node:events'
import express from 'express'
import preset from '../shared/network.json' with { type: 'json' }
import { presentationRouter } from '../backend/presentation.js'
import { boardSlots, place } from '../src/presentation/layout.ts'

test('two independent clients see the same editor direction and pins; writes survive restart', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'neuroscope-presentation-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  async function start() {
    const app = express().use('/p', presentationRouter(preset, directory))
    const server = createServer(app)
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const base = 'http://127.0.0.1:' + server.address().port + '/p'
    const write = (path, method, payload) =>
      fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    return {
      base,
      write,
      stop() {
        server.closeAllConnections()
        server.close()
      }
    }
  }
  const first = await start()
  t.after(() => first.stop())
  const controller = new AbortController()
  t.after(() => controller.abort())
  const response = await fetch(first.base + '/events', { signal: controller.signal })
  assert.equal(response.headers.get('X-Accel-Buffering'), 'no')
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  async function eventAt(revision) {
    for (;;) {
      const end = buffer.indexOf('\n\n')
      if (end >= 0) {
        const frame = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        const line = frame.split('\n').find((s) => s.startsWith('data: '))
        if (line) {
          const snapshot = JSON.parse(line.slice(6))
          if (snapshot.revision >= revision) return snapshot
        }
      } else {
        const { value, done } = await reader.read()
        assert.equal(done, false)
        buffer += value
      }
    }
  }
  const initial = await eventAt(0)
  assert.equal(initial.selected, null)
  const pin = (layer, shape, indices) =>
    first.write('/pins', 'POST', { layer, shape, indices, pinned: true })
  assert.equal((await pin(1, [3, 5, 5], [0, 12, 12])).status, 200)
  assert.equal((await pin(2, [8, 3, 3], [4])).status, 200)
  const edit = { ...initial, selected: { layer: 1, index: 12 }, visible: 2, direction: 'downstream' }
  const updated = await (await first.write('', 'PUT', edit)).json()
  const broadcast = await eventAt(updated.revision)
  assert.deepEqual(broadcast, updated)
  assert.deepEqual(broadcast.pins, [
    { layer: 1, index: 0 },
    { layer: 1, index: 12 },
    { layer: 2, index: 4 }
  ])
  assert.equal(broadcast.editorRevision, 1)
  assert.equal((await first.write('', 'PUT', edit)).status, 200) // lost response can be retried
  assert.equal((await first.write('', 'PUT', { ...edit, selected: { layer: 1, index: 0 } })).status, 409)
  assert.equal((await pin(1, [1, 1, 5], [1])).status, 409)
  assert.equal((await pin(1, [3, 5, 5], [1, 75])).status, 400)
  assert.equal((await first.write('', 'PUT', { ...updated, visible: 1 })).status, 400)
  assert.deepEqual(await (await fetch(first.base)).json(), broadcast)
  controller.abort()
  first.stop()
  const second = await start()
  t.after(() => second.stop())
  assert.deepEqual(await (await fetch(second.base)).json(), broadcast)
  const changed = await (
    await second.write('', 'PUT', {
      ...updated,
      network: { input_shape: [5], operations: [] },
      visible: 1,
      selected: null,
      direction: 'self'
    })
  ).json()
  assert.deepEqual(changed.pins, [])
  assert.equal(changed.network.layers.length, 1)
})

test('each layer and neuron has an independent movable and scalable board position', () => {
  const slots = boardSlots(1000, ['layer-1', 'layer-2'], ['node-1-12', 'node-2-4'])
  const a = slots.get('node-1-12')!,
    b = slots.get('node-2-4')!
  assert.notEqual(a.x, b.x)
  const moved = place(a, { x: 230, y: 120, scale: 1.8 }, 1000)
  assert.deepEqual([moved.x, moved.y, moved.width], [230, 120, 118 * 1.8])
  assert.equal(place(b, undefined, 1000).x, b.x)
  const narrow = place(a, { x: 3000, y: -20, scale: 3 }, 320)
  assert.ok(narrow.x + narrow.width <= 320 && narrow.y >= 0)
  assert.ok(boardSlots(360, ['layer-1', 'layer-2'], []).get('layer-2')!.y > 200)
})
