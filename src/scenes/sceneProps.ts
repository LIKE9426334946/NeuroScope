import type { Position } from '../types/network'
export interface SceneProps {
  positions: Position[]
  selected: number | null
  related: ReadonlySet<number>
  labels: boolean
  command: { index: number | null } | null
  onPick: (index: number) => void
  onFocus: (index: number) => void
}
