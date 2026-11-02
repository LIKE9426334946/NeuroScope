import type { CSSProperties } from 'react'

const paths = {
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  cube: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9',
  target: 'M12 2v4m0 12v4M2 12h4m12 0h4m-3 0a7 7 0 1 1-14 0 7 7 0 1 1 14 0Z',
  left: 'm13 6-6 6 6 6M7 12h13',
  right: 'm11 6 6 6-6 6M17 12H4',
  reset: 'M3 10a9 9 0 1 1 1 7m-1-13v6h6',
  clear: 'M7 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-5-7 5-7Zm4 4 6 6m0-6-6 6',
  pointer: 'm5 3 13 9-6 1-2 7L5 3Z',
  zoom: 'M16 16l5 5m-4-11a7 7 0 1 1-14 0 7 7 0 1 1 14 0Z',
  focus: 'M8 3H4v4m16 0V3h-4M4 17v4h4m8 0h4v-4m-8-8a3 3 0 1 1 0 6 3 3 0 1 1 0-6Z',
  sliders: 'M3 7h7m4 0h7M3 17h11m4 0h3M10 4v6m4 4v6',
  hash: 'm10 3-3 18m10-18-3 18M4 9h16M3 15h16',
  close: 'm6 6 12 12m0-12L6 18',
  cursor: 'M5 4h5M4 5v5m15-6h-5m6 1v5M4 14v5m1 1h5m10-6v5m-1 1h-5',
  orbit: 'M19 7c3 1 3 4-3 8s-12 5-13 2 2-7 8-10m5-2a3 3 0 1 1 0 6 3 3 0 1 1 0-6Z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  link: 'm9 14 6-6m-3-3 2-2a5 5 0 0 1 7 7l-3 3m-6 6-2 2a5 5 0 0 1-7-7l3-3',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  help: 'M8 9a4 4 0 1 1 6 3c-1 1-2 1-2 3m0 3h.01',
} as const

export function Icon({ name, size = 18, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>
}
