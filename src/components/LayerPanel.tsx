import type { Graph } from '../types/network'
import { layerName, rankName } from '../network/layers'
import { formatShape } from '../tensor/layout'
import { Legend, PanelHeading } from './Layout'
import { Icon } from './Icon'

interface Props {
  graph: Graph
  visible: number
  onView: (id: number) => void
  onEdit: () => void
  onAdd: () => void
  onRemove: () => void
}

export function LayerPanel({ graph, visible, onView, onEdit, onAdd, onRemove }: Props) {
  const tail = graph.layers[graph.layers.length - 1]
  const canConvolve = tail.shape.length === 3
  return (
    <aside className="panel layer-panel">
      <PanelHeading icon="layers" title="网络层级" english="NETWORK LAYERS" />
      <nav aria-label="观察网络层">
        {graph.layers.map((layer, i) => (
          <button
            key={layer.id}
            aria-pressed={visible === layer.id}
            className={'layer-row ' + (visible === layer.id ? 'active' : '')}
            onClick={() => onView(layer.id)}
          >
            <span className="layer-icon">
              <Icon
                name={layer.shape.length === 3 ? 'cube' : layer.shape.length === 2 ? 'grid' : 'layers'}
              />
            </span>
            <span>
              <strong>{layerName(layer.id)}</strong>
              <small>
                {i === 0
                  ? '输入 · ' + rankName(layer.shape.length)
                  : graph.operations[i - 1].type + ' 输出'}
              </small>
            </span>
            <code>{formatShape(layer.shape)}</code>
          </button>
        ))}
      </nav>
      <div className="graph-actions">
        <button className="edit-shape" onClick={onEdit}>
          <Icon name="sliders" size={15} />
          调整输入 Shape
        </button>
        <button className="edit-shape add-op" disabled={!canConvolve} onClick={onAdd}>
          <Icon name="layers" size={15} />
          添加 Conv2D
        </button>
        {canConvolve ? (
          <small>下一步输入为 {layerName(tail.id)}</small>
        ) : (
          <small>添加 Conv2D 需要三维输入 [C, H, W]。</small>
        )}
        {graph.operations.length > 0 && (
          <button className="undo-op" onClick={onRemove}>
            移除末尾运算
          </button>
        )}
      </div>
      <Legend />
    </aside>
  )
}
