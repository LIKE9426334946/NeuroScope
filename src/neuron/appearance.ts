export const palette = { normal: '#edf2fa', selected: '#57e9a8', related: '#438dff' } as const
export type NodeTone = keyof typeof palette
export function nodeTone(index: number, selected: number | null, related: ReadonlySet<number>): NodeTone {
  if (index === selected) return 'selected'
  return related.has(index) ? 'related' : 'normal'
}

// Keep dense tensors readable. The selected index is always labelled.
export function showIndex(index: number, selected: number | null, enabled: boolean, count: number) {
  return index === selected || (enabled && count <= 80)
}
