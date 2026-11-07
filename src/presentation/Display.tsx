import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useStore } from 'zustand'
import { Icon } from '../components/Icon'
import { neighbours } from '../connections/graph'
import { layerName } from '../network/layers'
import { nodeTone, palette } from '../neuron/appearance'
import { ProjectionScene } from '../scenes/ProjectionScene'
import { TensorScene } from '../scenes/TensorScene'
import { formatShape, indexToCoords, positionsFor } from '../tensor/layout'
import type { Layer, Position } from '../types/network'
import { BoardItem } from './BoardItem'
import { BoardPicker } from './BoardPicker'
import { boardSlots, layoutKey, place, readPreferences, type Placement } from './layout'
import type { Presentation } from './session'

const none = new Set<number>()
function LayerView({
  layer,
  selected,
  related,
  onPin,
  software
}: {
  layer: Layer
  selected: number | null
  related: ReadonlySet<number>
  onPin: (index: number) => void
  software: boolean
}) {
  const shapeId = layer.shape.join(',')
  const positions = useMemo(() => positionsFor(layer.shape), [shapeId])
  const [focus, setFocus] = useState<{ positions: Position[]; index: number } | null>(null)
  const Scene = software ? ProjectionScene : TensorScene
  return (
    <div
      className="board-scene"
      role="group"
      aria-label={selected !== null ? `选中神经元 #${selected}` : `关联神经元 ${related.size} 个`}
    >
      <Scene
        positions={positions}
        selected={selected}
        related={related}
        labels={false}
        command={focus?.positions === positions ? focus : null}
        onPick={onPin}
        onFocus={(index) => setFocus({ positions, index })}
      />
    </div>
  )
}

export function Display({ session }: { session: Presentation }) {
  const { graph, visible, selected, direction } = useStore(session.store)
  const { pins, connected, notice } = useStore(session.live)
  const [prefs, setPrefs] = useState(readPreferences)
  const [picker, setPicker] = useState(false)
  const [front, setFront] = useState('')
  const surface = useRef<HTMLDivElement>(null)
  const pickerBox = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(Math.max(300, document.documentElement.clientWidth))
  useEffect(() => {
    const el = surface.current!
    const observer = new ResizeObserver(() => setWidth(Math.max(300, el.clientWidth)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const currentPrefs = useRef(prefs)
  currentPrefs.current = prefs
  useEffect(() => {
    function save() {
      try {
        localStorage.setItem(layoutKey, JSON.stringify(currentPrefs.current))
      } catch {
        /* private storage */
      }
    }
    const timer = setTimeout(save, 120)
    window.addEventListener('pagehide', save)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('pagehide', save)
    }
  }, [prefs])
  useEffect(() => {
    if (!picker) return
    function pointer(e: PointerEvent) {
      if (!pickerBox.current?.contains(e.target as Node)) setPicker(false)
    }
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPicker(false)
        pickerBox.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', pointer)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', pointer)
      document.removeEventListener('keydown', key)
    }
  }, [picker])
  const choice = prefs.layers ?? [...new Set([...graph.layers.slice(0, 2).map((l) => l.id), visible])]
  const required = new Set(selected ? [selected.layer, visible] : [])
  const shown = graph.layers.filter((l) => choice.includes(l.id) || required.has(l.id))
  const related = useMemo(
    () => new Set(direction === 'self' ? [] : neighbours(graph, selected, direction)),
    [graph, selected, direction]
  )
  const validPins = pins.filter((n) => graph.layers.some((l) => l.id === n.layer && n.index < l.count))
  const nodeIds = validPins.map((n) => 'node-' + n.layer + '-' + n.index)
  const slots = boardSlots(
    width,
    shown.map((l) => 'layer-' + l.id),
    nodeIds
  )
  const frames = new Map(
    Array.from(slots, ([id, slot]) => [id, place(slot, prefs.placements[id], width)])
  )
  function move(id: string, p: Placement) {
    const used = place(slots.get(id)!, p, width)
    setPrefs((old) => ({
      ...old,
      placements: { ...old.placements, [id]: { x: used.x, y: used.y, scale: used.scale } }
    }))
  }
  const boardHeight = Array.from(frames.values()).reduce(
    (bottom, f) => Math.max(bottom, f.y + f.height + 18),
    0
  )
  return (
    <div className="display-shell">
      <header className="display-bar">
        <div className="display-brand">
          <img src="/neuroscope.svg" width="30" height="30" alt="" />
          <strong>NeuroScope</strong>
        </div>
        <div className="display-state" role="status" title={notice || '实时同步'}>
          <i className={'live-dot' + (connected ? '' : ' offline')} />
          {notice ||
            (selected ? (
              <>
                <span>
                  {layerName(selected.layer)} #{selected.index}
                </span>
                {direction !== 'self' && (
                  <span className="relation-caption">
                    {direction === 'upstream' ? '上游' : '下游'} · {related.size}
                  </span>
                )}
              </>
            ) : null)}
        </div>
        <div className="display-tools">
          <div className="picker-box" ref={pickerBox}>
            <button className="choose-button" aria-expanded={picker} onClick={() => setPicker(!picker)}>
              <Icon name="plus" size={15} />
              选择神经元
            </button>
            {picker && (
              <BoardPicker
                layers={graph.layers}
                pins={validPins}
                chosen={choice}
                required={required}
                onLayers={(layers) => setPrefs((p) => ({ ...p, layers }))}
                onPins={session.setPins}
                onClose={() => setPicker(false)}
              />
            )}
          </div>
          <button
            className="display-icon"
            title="整理画布位置"
            aria-label="整理画布位置"
            onClick={() => setPrefs((p) => ({ ...p, placements: {} }))}
          >
            <Icon name="reset" size={16} />
          </button>
          <a
            className="display-admin"
            href="/admin"
            target="_blank"
            rel="noopener"
            aria-label="打开管理页"
          >
            <Icon name="sliders" size={15} />
            管理
          </a>
        </div>
      </header>
      <div
        className="display-board"
        aria-label="神经元展示画布"
        ref={surface}
        style={{ height: boardHeight }}
      >
        {shown.map((layer, i) => {
          const id = 'layer-' + layer.id
          return (
            <BoardItem
              key={id}
              id={id}
              kind="layer"
              title={layerName(layer.id)}
              subtitle={formatShape(layer.shape)}
              frame={frames.get(id)!}
              onPlace={(p) => move(id, p)}
              front={front === id}
              onRaise={() => setFront(id)}
            >
              <LayerView
                layer={layer}
                selected={selected?.layer === layer.id ? selected.index : null}
                related={visible === layer.id ? related : none}
                software={i >= 4}
                onPin={(index) => void session.setPins(layer.id, [index], true)}
              />
            </BoardItem>
          )
        })}
        {validPins.map((n, i) => {
          const layer = graph.layers.find((l) => l.id === n.layer)!
          const id = nodeIds[i]
          const tone = nodeTone(
            n.index,
            selected?.layer === n.layer ? selected.index : null,
            visible === n.layer ? related : none
          )
          return (
            <BoardItem
              key={id}
              id={id}
              kind="node"
              title={layerName(n.layer) + ' #' + n.index}
              frame={frames.get(id)!}
              tone={tone}
              onPlace={(p) => move(id, p)}
              front={front === id}
              onRaise={() => setFront(id)}
            >
              <i
                className="pinned-sphere"
                style={{ '--sphere-color': palette[tone] } as CSSProperties}
              />
              <b>
                L{String(n.layer).padStart(2, '0')} · #{n.index}
              </b>
              <small>[{indexToCoords(layer.shape, n.index).join(', ')}]</small>
            </BoardItem>
          )
        })}
        {!frames.size && (
          <button className="empty-board" onClick={() => setPicker(true)}>
            选择展示内容
          </button>
        )}
      </div>
    </div>
  )
}
