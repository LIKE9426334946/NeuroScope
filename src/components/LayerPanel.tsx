import type { Layer } from '../types/network'
import { layerName, rankName } from '../network/layers'
import { formatShape } from '../tensor/layout'
import { Legend, PanelHeading } from './Layout'
import { Icon } from './Icon'

export function LayerPanel({
  layers,
  visible,
  onView,
  onEdit
}: {
  layers: Layer[]
  visible: number
  onView: (id: number) => void
  onEdit: () => void
}) {
  return (
    <aside className="panel layer-panel">
      <PanelHeading icon="layers" title="网络层级" english="NETWORK LAYERS" />
      <nav aria-label="观察网络层">
        {layers.map((layer) => (
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
              <small>{rankName(layer.shape.length)}</small>
            </span>
            <code>{formatShape(layer.shape)}</code>
          </button>
        ))}
      </nav>
      <button className="edit-shape" onClick={onEdit}>
        <Icon name="sliders" size={15} />
        调整当前层 Shape
      </button>
      <Legend />
    </aside>
  )
}
