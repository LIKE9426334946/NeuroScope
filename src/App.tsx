import { useMemo, useState } from 'react'
import { Icon } from './components/Icon'
import { Layout, PanelHeading } from './components/Layout'
import { LayerPanel } from './components/LayerPanel'
import { ShapeDialog } from './components/ShapeDialog'
import { TensorScene } from './scenes/TensorScene'
import { defaultLayers, createLayer, layerName } from './network/layers'
import { formatShape, positionsFor } from './tensor/layout'

export function App() {
  const [layers, setLayers] = useState(defaultLayers)
  const [visible, setVisible] = useState(3)
  const [epoch, reset] = useState(0)
  const [editing, setEditing] = useState(false)
  const layer = layers.find(item => item.id === visible)!
  const positions = useMemo(() => positionsFor(layer.shape), [layer])
  return <Layout layerCount={layers.length} nodeCount={layers.reduce((sum, item) => sum + item.count, 0)}>
    <LayerPanel layers={layers} visible={visible} onView={setVisible} onEdit={() => setEditing(true)} />
    <section className="panel viewer"><div className="viewer-head"><div><Icon name="cube" /><strong>张量视图</strong></div><span className="view-tag">3D VIEWPORT</span></div>
      <div className="stage"><div className="scene-hud"><div className="eyebrow">CURRENT LAYER</div><h2>{layerName(layer.id)}</h2><p>{formatShape(layer.shape)} <span>· {layer.count} 个神经元</span></p></div><TensorScene positions={positions} epoch={epoch} /></div>
      <div className="scene-hints"><span><Icon name="orbit" size={14} />拖动旋转</span><span><Icon name="zoom" size={14} />滚轮缩放</span></div>
      <div className="controlbar"><button onClick={() => reset(epoch + 1)}><Icon name="reset" />重置视角</button></div>
    </section>
    <aside className="panel inspector"><PanelHeading icon="target" title="神经元详情" english="INSPECTOR" /><div className="empty-focus"><Icon name="target" size={32} /><h3>尚未选择神经元</h3></div></aside>
    {editing && <ShapeDialog layer={layer} onApply={shape => setLayers(layers.map(item => item.id === visible ? createLayer(visible, shape) : item))} onClose={() => setEditing(false)} />}
  </Layout>
}
