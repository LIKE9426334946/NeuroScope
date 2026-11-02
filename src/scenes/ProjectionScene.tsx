import { useLayoutEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FOV, RADIUS, focusNode, frameLayer } from './camera'
import { nodeTone, palette, showIndex, type NodeTone } from '../neuron/appearance'
import type { SceneProps } from './sceneProps'

function sphereSprite(tone: NodeTone) {
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 100
  const ctx = sprite.getContext('2d')!
  const stops = {
    normal: ['#ffffff', palette.normal, '#c6d2e2', '#8a9bb1', '#536678'],
    selected: ['#d0ffed', '#8cffc8', palette.selected, '#24ad76', '#17654c'],
    related: ['#e0f2ff', '#a4d1ff', palette.related, '#396cc7', '#254c84'],
  }[tone]
  const fill = ctx.createRadialGradient(36, 27, 1, 49, 51, 49)
  const offsets = [0, 0.24, 0.56, 0.82, 1]
  stops.forEach((color, i) => fill.addColorStop(offsets[i], color))
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(50, 50, 48.5, 0, Math.PI * 2)
  ctx.fill()
  return sprite
}

interface Projected { index: number; x: number; y: number; z: number; r: number }

/** Software projection for browsers with WebGL2 disabled. Repaint only on change. */
export function ProjectionScene(props: SceneProps) {
  const { positions, selected, related, labels, command } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef(props)
  const renderer = useRef<{ redraw: () => void; move: (index: number | null) => void } | null>(null)
  useLayoutEffect(() => { live.current = props })
  useLayoutEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const camera = new PerspectiveCamera(FOV, 1, 0.05, 500)
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = false
    const sprites = { normal: sphereSprite('normal'), selected: sphereSprite('selected'), related: sphereSprite('related') }
    const work = new Vector3()
    const points: Projected[] = positions.map((_, index) => ({ index, x: 0, y: 0, z: 0, r: 0 }))
    let width = 1
    let height = 1
    let frame = 0
    function draw() {
      frame = 0
      camera.updateMatrixWorld()
      ctx.clearRect(0, 0, width, height)
      const focal = height / (2 * Math.tan(FOV * Math.PI / 360))
      for (const p of points) {
        work.fromArray(positions[p.index]).applyMatrix4(camera.matrixWorldInverse)
        p.z = -work.z
        p.r = RADIUS * focal / p.z
        p.x = width / 2 + work.x * focal / p.z
        p.y = height / 2 - work.y * focal / p.z
      }
      points.sort((a, b) => b.z - a.z)
      const { selected, related, labels } = live.current
      ctx.font = '600 10px Consolas, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const p of points) {
        if (p.z < camera.near || p.x + p.r < 0 || p.y + p.r < 0 || p.x - p.r > width || p.y - p.r > height) continue
        const tone = nodeTone(p.index, selected, related)
        ctx.drawImage(sprites[tone], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
        if (showIndex(p.index, selected, labels, positions.length)) {
          ctx.fillStyle = '#152330'
          ctx.fillText('#' + p.index, p.x, p.y)
        }
      }
    }
    function redraw() { if (!frame) frame = requestAnimationFrame(draw) }
    function move(index: number | null) {
      if (index === null) {
        const distance = frameLayer(camera, positions, width, height)
        controls.target.set(0, 0, 0)
        controls.minDistance = 0.55
        controls.maxDistance = Math.max(80, distance * 3)
      } else {
        focusNode(camera, controls.target, positions[index])
      }
      controls.update()
      redraw()
    }
    function size() {
      width = Math.max(1, canvas.clientWidth)
      height = Math.max(1, canvas.clientHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      move(null)
    }
    function hit(event: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      // Draw far-to-near, pick near-to-far so occluded balls cannot steal a click.
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i]
        if (p.z >= camera.near && (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r ** 2) return p.index
      }
      return null
    }
    let down: [number, number] | null = null
    let dragged = false
    function start(event: PointerEvent) {
      if (!event.isPrimary) { dragged = true; return }
      down = [event.clientX, event.clientY]
      dragged = false
    }
    function motion(event: PointerEvent) {
      if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) dragged = true
    }
    function activate(event: MouseEvent) {
      if (event.button !== 0 || dragged) return
      const index = hit(event)
      if (index !== null) (event.type === 'dblclick' ? live.current.onFocus : live.current.onPick)(index)
      down = null
    }
    size()
    const observer = new ResizeObserver(size)
    observer.observe(canvas)
    controls.addEventListener('change', redraw)
    canvas.addEventListener('pointerdown', start)
    canvas.addEventListener('pointermove', motion)
    canvas.addEventListener('click', activate)
    canvas.addEventListener('dblclick', activate)
    renderer.current = { redraw, move }
    return () => {
      renderer.current = null
      observer.disconnect()
      controls.removeEventListener('change', redraw)
      controls.dispose()
      canvas.removeEventListener('pointerdown', start)
      canvas.removeEventListener('pointermove', motion)
      canvas.removeEventListener('click', activate)
      canvas.removeEventListener('dblclick', activate)
      cancelAnimationFrame(frame)
    }
  }, [positions])
  useLayoutEffect(() => { renderer.current?.redraw() }, [selected, related, labels])
  useLayoutEffect(() => { if (command) renderer.current?.move(command.index) }, [command])
  return <canvas ref={canvasRef} className="projection-canvas" aria-label="可旋转、可选择神经元的三维视图" />
}
