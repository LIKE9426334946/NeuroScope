import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FOV, RADIUS, frameLayer, type Position } from './camera'

function sphereSprite() {
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 88
  const ctx = sprite.getContext('2d')!
  const fill = ctx.createRadialGradient(31, 23, 2, 44, 46, 43)
  fill.addColorStop(0, '#ffffff')
  fill.addColorStop(0.23, '#edf3fc')
  fill.addColorStop(0.54, '#ccd7e5')
  fill.addColorStop(0.81, '#95a5ba')
  fill.addColorStop(1, '#617287')
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(44, 44, 42.4, 0, Math.PI * 2)
  ctx.fill()
  return sprite
}

/** The same perspective camera and orbit controls work without a GPU context. */
export function ProjectionScene({ positions, epoch }: { positions: Position[]; epoch: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const camera = new PerspectiveCamera(FOV, 1, 0.05, 500)
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = false
    const sprite = sphereSprite()
    const work = new Vector3()
    const points = positions.map((_, index) => ({ index, x: 0, y: 0, z: 0, r: 0 }))
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
      for (const p of points) {
        if (p.z < camera.near || p.x + p.r < 0 || p.y + p.r < 0 || p.x - p.r > width || p.y - p.r > height) continue
        ctx.drawImage(sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)
      }
    }
    function invalidate() { if (!frame) frame = requestAnimationFrame(draw) }
    function size() {
      width = Math.max(1, canvas.clientWidth)
      height = Math.max(1, canvas.clientHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const distance = frameLayer(camera, positions, width, height)
      controls.target.set(0, 0, 0)
      controls.minDistance = 0.55
      controls.maxDistance = Math.max(80, distance * 3)
      controls.update()
      invalidate()
    }
    size()
    const observer = new ResizeObserver(size)
    observer.observe(canvas)
    controls.addEventListener('change', invalidate)
    return () => {
      observer.disconnect()
      controls.removeEventListener('change', invalidate)
      controls.dispose()
      cancelAnimationFrame(frame)
    }
  }, [positions, epoch])
  return <canvas ref={canvasRef} className="projection-canvas" aria-label="可旋转的神经元三维视图" />
}
