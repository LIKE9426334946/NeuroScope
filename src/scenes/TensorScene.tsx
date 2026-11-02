import { lazy, Suspense } from 'react'
import type { Position } from './camera'
import { ProjectionScene } from './ProjectionScene'

const WebGLScene = lazy(() => import('./WebGLScene'))
const probe = document.createElement('canvas').getContext('webgl2')
const hasWebGL = Boolean(probe)
probe?.getExtension('WEBGL_lose_context')?.loseContext()

export function TensorScene(props: { positions: Position[]; epoch: number }) {
  if (!hasWebGL) return <ProjectionScene {...props} />
  return <Suspense fallback={<div className="scene-loading">正在准备三维场景…</div>}><WebGLScene {...props} /></Suspense>
}
