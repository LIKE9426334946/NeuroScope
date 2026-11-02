import { Box3, PerspectiveCamera, Vector3 } from 'three'

import type { Position } from '../types/network'
export type { Position }
export const RADIUS = 0.29
export const FOV = 34

/** Fit projected bounds in both screen dimensions, including long, thin tensors. */
export function frameLayer(
  camera: PerspectiveCamera,
  positions: Position[],
  width: number,
  height: number
) {
  const box = new Box3()
  const point = new Vector3()
  for (const p of positions) box.expandByPoint(point.fromArray(p))
  box.expandByScalar(RADIUS)
  const direction = new Vector3(
    ...(box.max.z - box.min.z > 1 ? ([0.69, 0.48, 1.16] as const) : ([0, 0, 1] as const))
  ).normalize()
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), direction).normalize()
  const up = new Vector3().crossVectors(direction, right)
  const tanY = Math.tan((FOV * Math.PI) / 360)
  const aspect = Math.max(0.05, width / Math.max(1, height))
  let distance = 3
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        point.set(x, y, z)
        const reach = Math.max(
          Math.abs(point.dot(up)) / tanY,
          Math.abs(point.dot(right)) / (tanY * aspect)
        )
        distance = Math.max(distance, point.dot(direction) + reach * 1.35)
      }
  camera.position.copy(direction).multiplyScalar(distance)
  camera.aspect = aspect
  camera.fov = FOV
  camera.near = 0.05
  camera.far = Math.max(500, distance * 10)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  return distance
}

export function focusNode(camera: PerspectiveCamera, target: Vector3, p: Position) {
  const heading = camera.position.clone().sub(target).normalize()
  target.fromArray(p)
  camera.position.copy(target).addScaledVector(heading, 3.7)
  camera.lookAt(target)
  camera.updateMatrixWorld()
}
