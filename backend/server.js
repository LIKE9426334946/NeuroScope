import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import preset from '../shared/network.json' with { type: 'json' }
import schema from './openapi.json' with { type: 'json' }
import { buildGraph, describeGraph } from '../src/network/graph.js'

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 3010)
if (host !== '127.0.0.1' || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('HOST 必须为 127.0.0.1，PORT 必须是 1–65535 的整数。')
}

const network = describeGraph(buildGraph(preset))

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const index = join(dist, 'index.html')
if (process.env.NODE_ENV === 'production' && !existsSync(index)) {
  throw new Error('缺少 dist/index.html。请先在项目根目录运行 npm run build。')
}

const app = express()
app.disable('x-powered-by')
app.set('case sensitive routing', true)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'NeuroScope' }))
app.get('/api/network', (_req, res) => res.json(network))
app.get('/api/openapi.json', (_req, res) => res.json(schema))
app.get('/api/docs', (_req, res) => res.sendFile(fileURLToPath(new URL('./api.html', import.meta.url))))
app.all(['/api/health', '/api/network', '/api/docs', '/api/openapi.json'], (_req, res) => {
  res.set('Allow', 'GET, HEAD').status(405).json({ detail: 'Method Not Allowed' })
})
app.use('/api', (_req, res) => res.status(404).json({ detail: 'Not Found' }))

// Only hashed Vite assets are immutable. A missing chunk must return a real 404.
app.use('/assets', express.static(join(dist, 'assets'), { index: false, immutable: true, maxAge: '1y' }))
app.use('/assets', (_req, res) => res.sendStatus(404))
app.use(
  express.static(dist, {
    index: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache')
  })
)
app.get('/{*path}', (req, res) => {
  if (!req.accepts('html')) return res.sendStatus(404)
  res.set('Cache-Control', 'no-cache').sendFile(index)
})

app.listen(port, host).on('listening', () => {
  console.log(`NeuroScope listening at http://${host}:${port}`)
})
