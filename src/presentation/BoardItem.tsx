import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import type { Placement } from './layout'

interface Props {
  id: string
  kind: 'layer' | 'node'
  title: string
  subtitle?: string
  frame: Placement & { width: number; height: number }
  onPlace: (p: Placement) => void
  onRaise: () => void
  front: boolean
  children: ReactNode
  tone?: string
}

export function BoardItem({
  id,
  kind,
  title,
  subtitle,
  frame,
  onPlace,
  onRaise,
  front,
  children,
  tone
}: Props) {
  const element = useRef<HTMLElement>(null)
  const drag = useRef<{ mode: 'move' | 'size'; x: number; y: number; start: typeof frame } | null>(null)
  function start(e: PointerEvent<HTMLElement>, mode: 'move' | 'size') {
    if (e.button !== 0 || !e.isPrimary) return
    e.preventDefault()
    e.currentTarget.focus({ preventScroll: true })
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { mode, x: e.clientX, y: e.clientY, start: frame }
    onRaise()
  }
  function move(e: PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    const dx = e.clientX - d.x,
      dy = e.clientY - d.y
    if (d.mode === 'move') onPlace({ x: d.start.x + dx, y: d.start.y + dy, scale: d.start.scale })
    else
      onPlace({
        x: d.start.x,
        y: d.start.y,
        scale:
          d.start.scale *
          (1 + (dx * d.start.width + dy * d.start.height) / (d.start.width ** 2 + d.start.height ** 2))
      })
  }
  function keys(e: KeyboardEvent<HTMLElement>) {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    }
    const delta = directions[e.key]
    if (delta) onPlace({ ...frame, x: frame.x + delta[0] * 12, y: frame.y + delta[1] * 12 })
    else if (['+', '=', '-'].includes(e.key))
      onPlace({ ...frame, scale: frame.scale * (e.key === '-' ? 1 / 1.15 : 1.15) })
    else return
    e.preventDefault()
  }
  useEffect(() => {
    const el = element.current!
    function wheel(e: WheelEvent) {
      if (kind === 'layer' && !(e.target as Element)?.closest('.board-grab')) return
      e.preventDefault()
      onPlace({
        ...frame,
        scale: frame.scale * Math.exp(-Math.max(-180, Math.min(180, e.deltaY)) * 0.0025)
      })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [kind, frame, onPlace])
  const events = {
    onPointerMove: move,
    onPointerUp: () => {
      drag.current = null
    },
    onPointerCancel: () => {
      drag.current = null
    },
    onLostPointerCapture: () => {
      drag.current = null
    },
    onKeyDown: keys
  }
  return (
    <article
      ref={element}
      data-item={id}
      data-tone={tone}
      aria-label={title}
      className={'board-item ' + kind + '-item'}
      onPointerDownCapture={onRaise}
      style={{
        left: frame.x,
        top: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex: front ? 3 : 1
      }}
    >
      {kind === 'layer' ? (
        <>
          <header
            className="board-grab"
            tabIndex={0}
            aria-label={'移动 ' + title}
            title="拖动标题移动，滚轮缩放"
            onPointerDown={(e) => start(e, 'move')}
            {...events}
          >
            <Icon name="grip" size={17} />
            <strong>{title}</strong>
            <code>{subtitle}</code>
          </header>
          {children}
        </>
      ) : (
        <div
          className="pin-grab"
          tabIndex={0}
          aria-label={'移动 ' + title}
          title="拖动移动，滚轮或双击缩放"
          onPointerDown={(e) => start(e, 'move')}
          {...events}
          onDoubleClick={() => onPlace({ ...frame, scale: frame.scale > 1.4 ? 1 : 1.7 })}
        >
          {children}
        </div>
      )}
      <button
        type="button"
        className="board-resize"
        title="拖动缩放，也可使用加减键"
        aria-label={'缩放 ' + title}
        onPointerDown={(e) => start(e, 'size')}
        {...events}
      >
        <span />
      </button>
    </article>
  )
}
