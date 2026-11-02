import { lazy, Suspense } from 'react'
import { ProjectionScene } from './ProjectionScene'
import type { SceneProps } from './sceneProps'

const WebGLScene = lazy(() => import('./WebGLScene'))
function supportsWebGL() {
  const probe = document.createElement('canvas').getContext('webgl2')
  probe?.getExtension('WEBGL_lose_context')?.loseContext()
  return Boolean(probe)
}
const hasWebGL = supportsWebGL()

export function TensorScene(props: SceneProps) {
  if (!hasWebGL) return <ProjectionScene {...props} />
  return (
    <Suspense fallback={<div className="scene-loading">正在准备三维场景…</div>}>
      <WebGLScene {...props} />
    </Suspense>
  )
}
