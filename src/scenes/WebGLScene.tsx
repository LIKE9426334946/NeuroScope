import { useLayoutEffect, useRef, type ComponentRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { InstancedMesh, Matrix4, PerspectiveCamera } from 'three'
import { FOV, RADIUS, frameLayer, type Position } from './camera'

function CameraRig({ positions, epoch }: { positions: Position[]; epoch: number }) {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    const control = ref.current!
    const distance = frameLayer(camera as PerspectiveCamera, positions, size.width, size.height)
    control.target.set(0, 0, 0)
    control.minDistance = 0.55
    control.maxDistance = Math.max(80, distance * 3)
    control.update()
    invalidate()
  }, [camera, epoch, positions, size.width, size.height, invalidate])
  return <OrbitControls ref={ref} makeDefault enableDamping />
}

function Spheres({ positions }: { positions: Position[] }) {
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
  const dense = positions.length > 1000
  return <instancedMesh key={positions.length} ref={ref} args={[undefined, undefined, positions.length]}>
    <sphereGeometry args={[RADIUS, dense ? 10 : 28, dense ? 7 : 20]} /><meshStandardMaterial color="#eef2f8" roughness={0.31} metalness={0.2} />
  </instancedMesh>
}

export default function WebGLScene(props: { positions: Position[]; epoch: number }) {
  return <Canvas dpr={[1, 1.6]} frameloop="demand" camera={{ fov: FOV }} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.95} /><hemisphereLight args={['#ffffff', '#475c77', 1]} />
    <directionalLight position={[-4, 7, 5]} intensity={2.2} /><directionalLight position={[5, 2, -3]} intensity={1.2} color="#c9e6ff" />
    <Spheres positions={props.positions} /><CameraRig {...props} />
  </Canvas>
}
