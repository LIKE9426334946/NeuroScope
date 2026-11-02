import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function WebGLScene({ positions, epoch }: { positions: [number, number, number][]; epoch: number }) {
  return <Canvas key={epoch} dpr={[1, 1.6]} frameloop="demand" camera={{ position: [5.1, 3.5, 8.4], fov: 34 }} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={1.3} /><hemisphereLight args={['#ffffff', '#475c77', 1.2]} />
    <directionalLight position={[-4, 7, 5]} intensity={3} /><directionalLight position={[5, 2, -3]} intensity={1.7} color="#c9e6ff" />
    {positions.map((p, index) => <mesh key={index} position={p}><sphereGeometry args={[0.3, 24, 16]} /><meshStandardMaterial color="#edf2fa" roughness={0.28} metalness={0.26} /></mesh>)}
    <OrbitControls makeDefault enableDamping minDistance={1} maxDistance={160} />
  </Canvas>
}
