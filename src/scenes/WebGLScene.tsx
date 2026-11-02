import { useLayoutEffect, useRef, type ComponentRef } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { Color, InstancedMesh, Matrix4, PerspectiveCamera } from 'three'
import { FOV, RADIUS, focusNode, frameLayer } from './camera'
import { nodeTone, palette } from '../neuron/appearance'
import type { SceneProps } from './sceneProps'

function CameraRig({ positions, command }: Pick<SceneProps, 'positions' | 'command'>) {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    const control = ref.current!
    const cam = camera as PerspectiveCamera
    const distance = frameLayer(cam, positions, size.width, size.height)
    control.target.set(0, 0, 0)
    control.minDistance = 0.55
    control.maxDistance = Math.max(80, distance * 3)
    if (command?.index != null) focusNode(cam, control.target, positions[command.index])
    control.update()
    invalidate()
  }, [camera, positions, size.width, size.height, command, invalidate])
  return <OrbitControls ref={ref} makeDefault enableDamping={false} />
}

function Spheres({ positions, selected, related, labels, onPick, onFocus }: SceneProps) {
  const ref = useRef<InstancedMesh>(null)
  const invalidate = useThree(state => state.invalidate)
  useLayoutEffect(() => {
    const mesh = ref.current!
    const transform = new Matrix4()
    positions.forEach(([x, y, z], index) => mesh.setMatrixAt(index, transform.makeTranslation(x, y, z)))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    invalidate()
  }, [positions, invalidate])
  useLayoutEffect(() => {
    const mesh = ref.current!
    const color = new Color()
    for (let i = 0; i < positions.length; i++) mesh.setColorAt(i, color.set(palette[nodeTone(i, selected, related)]))
    mesh.instanceColor!.needsUpdate = true
    invalidate()
  }, [positions, selected, related, invalidate])
  function activate(event: ThreeEvent<MouseEvent>, action: (i: number) => void) {
    event.stopPropagation()
    if (event.button === 0 && event.delta <= 5 && event.instanceId != null) action(event.instanceId)
  }
  const dense = positions.length > 1000
  const labelIds = labels && positions.length <= 80 ? positions.map((_, i) => i) : selected == null ? [] : [selected]
  return <>
    <instancedMesh key={positions.length} ref={ref} args={[undefined, undefined, positions.length]}
      onClick={e => activate(e, onPick)} onDoubleClick={e => activate(e, onFocus)}>
      <sphereGeometry args={[RADIUS, dense ? 10 : 28, dense ? 7 : 20]} />
      <meshStandardMaterial color="white" roughness={0.31} metalness={0.15} />
    </instancedMesh>
    {labelIds.map(i => <Html key={i} position={positions[i]} center pointerEvents="none" zIndexRange={[3, 1]}>
      <span className={'sphere-label ' + (i === selected ? 'anchor' : '')}>#{i}</span>
    </Html>)}
  </>
}

export default function WebGLScene(props: SceneProps) {
  return <Canvas dpr={[1, 1.6]} frameloop="demand" camera={{ fov: FOV }} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.95} /><hemisphereLight args={['#ffffff', '#475c77', 1]} />
    <directionalLight position={[-4, 7, 5]} intensity={2.2} /><directionalLight position={[5, 2, -3]} intensity={1.2} color="#c9e6ff" />
    <Spheres {...props} /><CameraRig positions={props.positions} command={props.command} />
  </Canvas>
}
