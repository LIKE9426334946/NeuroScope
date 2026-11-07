import { useMemo, useState } from 'react'
import { useStore } from 'zustand'
import { Icon } from './components/Icon'
import { Layout } from './components/Layout'
import { LayerPanel } from './components/LayerPanel'
import { ShapeDialog } from './components/ShapeDialog'
import { Conv2DDialog } from './components/Conv2DDialog'
import { directionNames, Inspector } from './components/Inspector'
import { TensorScene } from './scenes/TensorScene'
import { layerName } from './network/layers'
import { formatShape, positionsFor } from './tensor/layout'
import { neighbours } from './connections/graph'
import { adjacentLayer } from './stores/explorer'
import type { Position } from './types/network'
import type { Presentation } from './presentation/session'

const noNodes: readonly number[] = []

export function App({ session }: { session: Presentation }) {
  const { source, pins, notice } = useStore(session.live)
  const {
    graph,
    visible,
    selected,
    direction,
    view,
    select,
    explore,
    clear,
    reshapeInput,
    appendConv2D,
    removeLastOperation
  } = useStore(session.store)
  const { layers, operations } = graph
  const [editing, setEditing] = useState<'input' | 'conv' | null>(null)
  const [labels, setLabels] = useState(false)
  const [cameraRequest, setCameraRequest] = useState<{
    positions: Position[]
    index: number | null
  } | null>(null)
  const layer = layers.find((item) => item.id === visible)!
  const anchor = layers.find((item) => item.id === selected?.layer) ?? null
  const positions = useMemo(() => positionsFor(layer.shape), [layer])
  const upstream = useMemo(() => neighbours(graph, selected, 'upstream'), [graph, selected])
  const downstream = useMemo(() => neighbours(graph, selected, 'downstream'), [graph, selected])
  const related = direction === 'upstream' ? upstream : direction === 'downstream' ? downstream : noNodes
  const incoming = operations.find((op) => op.output.id === anchor?.id)
  const outgoing = operations.find((op) => op.input.id === anchor?.id)
  const activeOp = direction === 'downstream' ? outgoing : (incoming ?? outgoing)
  const highlights = useMemo(() => new Set(related), [related])
  const canUp = selected && adjacentLayer(layers, selected.layer, 'upstream')
  const canDown = selected && adjacentLayer(layers, selected.layer, 'downstream')
  function focus(index: number) {
    select(index)
    setCameraRequest({ positions, index })
  }
  return (
    <Layout
      source={source}
      notice={notice}
      layerCount={layers.length}
      nodeCount={layers.reduce((sum, item) => sum + item.count, 0)}
    >
      <LayerPanel
        graph={graph}
        pins={pins}
        onLocate={(node) => {
          view(node.layer)
          select(node.index)
        }}
        visible={visible}
        onView={view}
        onEdit={() => setEditing('input')}
        onAdd={() => setEditing('conv')}
        onRemove={removeLastOperation}
      />
      <section className="panel viewer" aria-label="张量视图">
        <div className="viewer-head">
          <div>
            <Icon name="cube" />
            <strong>张量视图</strong>
            <span className="view-tag">3D VIEWPORT</span>
          </div>
          <button
            className={'label-toggle ' + (labels ? 'on' : '')}
            onClick={() => setLabels(!labels)}
            aria-pressed={labels}
            title="显示节点编号；超过 80 个节点时仅标注所选节点"
          >
            <Icon name="hash" size={14} />
            编号
          </button>
        </div>
        <div className="stage">
          <div className="scene-hud">
            <div className="eyebrow">CURRENT LAYER</div>
            <h2>{layerName(visible)}</h2>
            <p>
              {formatShape(layer.shape)} <span>· {layer.count.toLocaleString()} 个神经元</span>
            </p>
          </div>
          {direction !== 'self' && (
            <div className="direction-tag">
              {directionNames[direction]}
              <i />
              {related.length} 个关联
            </div>
          )}
          <TensorScene
            positions={positions}
            selected={selected?.layer === visible ? selected.index : null}
            related={highlights}
            labels={labels}
            command={cameraRequest?.positions === positions ? cameraRequest : null}
            onPick={select}
            onFocus={focus}
          />
        </div>
        <div className="scene-hints">
          <span>
            <Icon name="orbit" size={14} />
            拖动旋转
          </span>
          <span>
            <Icon name="zoom" size={14} />
            滚轮缩放
          </span>
          <span>
            <Icon name="pointer" size={14} />
            单击选择
          </span>
          <span>
            <Icon name="focus" size={14} />
            双击聚焦
          </span>
        </div>
        <div className="controlbar">
          <button
            className={direction === 'upstream' ? 'in-direction' : ''}
            disabled={!canUp}
            onClick={() => explore('upstream')}
            title={
              !selected ? '先选择神经元' : !canUp ? '所选节点位于第一层' : '查看连接到所选神经元的节点'
            }
          >
            <Icon name="left" size={15} />
            上一层
          </button>
          <button
            className={direction === 'downstream' ? 'in-direction' : ''}
            disabled={!canDown}
            onClick={() => explore('downstream')}
            title={
              !selected
                ? '先选择神经元'
                : !canDown
                  ? '所选节点位于最后一层'
                  : '查看受到所选神经元影响的节点'
            }
          >
            下一层
            <Icon name="right" size={15} />
          </button>
          <span className="control-spacer" />
          <button onClick={() => setCameraRequest({ positions, index: null })}>
            <Icon name="reset" size={15} />
            重置视角
          </button>
          <button disabled={!selected} onClick={clear}>
            <Icon name="clear" size={15} />
            重置选择
          </button>
        </div>
      </section>
      <Inspector
        layer={layer}
        anchor={anchor}
        selected={selected}
        direction={direction}
        related={related}
        pinned={pins.some((node) => node.layer === selected?.layer && node.index === selected.index)}
        onPin={(pinned) => {
          if (selected) void session.setPins(selected.layer, [selected.index], pinned)
        }}
        upstream={upstream.length}
        operation={activeOp}
        downstream={downstream.length}
        onSelect={select}
        onReturn={() => {
          if (selected) view(selected.layer)
        }}
      />
      {editing === 'input' && (
        <ShapeDialog layer={layers[0]} onApply={reshapeInput} onClose={() => setEditing(null)} />
      )}
      {editing === 'conv' && (
        <Conv2DDialog
          input={layers[layers.length - 1]}
          onApply={appendConv2D}
          onClose={() => setEditing(null)}
        />
      )}
    </Layout>
  )
}
