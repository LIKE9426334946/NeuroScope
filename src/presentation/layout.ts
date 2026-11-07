export interface Placement {
  x: number
  y: number
  scale: number
}
export interface Slot {
  x: number
  y: number
  width: number
  height: number
}
export interface Preferences {
  layers: number[] | null
  placements: Record<string, Placement>
}
export const layoutKey = 'neuroscope.display.layout.v1'
const gap = 18
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function readPreferences(): Preferences {
  const empty: Preferences = { layers: null, placements: {} }
  try {
    const raw = JSON.parse(localStorage.getItem(layoutKey) ?? 'null')
    if (!raw || typeof raw !== 'object') return empty
    if (Array.isArray(raw.layers))
      empty.layers = raw.layers.filter((id: unknown) => Number.isSafeInteger(id))
    for (const [key, value] of Object.entries(raw.placements ?? {})) {
      const p = value as Placement
      if (/^(layer-\d+|node-\d+-\d+)$/.test(key) && p && [p.x, p.y, p.scale].every(Number.isFinite))
        empty.placements[key] = p
    }
  } catch {
    /* The board remains usable without browser storage. */
  }
  return empty
}

export function boardSlots(width: number, layerKeys: string[], nodeKeys: string[]) {
  const slots = new Map<string, Slot>()
  const columns = width >= 1400 && layerKeys.length >= 3 ? 3 : width >= 690 ? 2 : 1
  const cardWidth = (width - (columns + 1) * gap) / columns
  const cardHeight = clamp(cardWidth * 0.69, 225, 470)
  layerKeys.forEach((key, i) =>
    slots.set(key, {
      x: gap + (i % columns) * (cardWidth + gap),
      y: gap + Math.floor(i / columns) * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight
    })
  )
  const pinsY = gap + Math.ceil(layerKeys.length / columns) * (cardHeight + gap)
  const pinColumns = Math.max(1, Math.floor((width - gap) / (118 + gap)))
  nodeKeys.forEach((key, i) =>
    slots.set(key, {
      x: gap + (i % pinColumns) * (118 + gap),
      y: pinsY + Math.floor(i / pinColumns) * 114,
      width: 118,
      height: 100
    })
  )
  return slots
}

export function place(slot: Slot, saved: Placement | undefined, width: number) {
  const scale = clamp(saved?.scale ?? 1, 0.6, Math.min(3, (width - 12) / slot.width))
  const w = slot.width * scale
  return {
    x: clamp(saved?.x ?? slot.x, 6, width - w - 6),
    y: Math.max(6, saved?.y ?? slot.y),
    scale,
    width: w,
    height: slot.height * scale
  }
}
