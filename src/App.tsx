import { useState } from 'react'
import { Icon } from './components/Icon'
import { Layout, Legend, PanelHeading } from './components/Layout'
import { TensorScene } from './scenes/TensorScene'

const previewLayers = [
  { shape: '[5]', name: '一维向量', positions: Array.from({ length: 5 }, (_, i) => [(i - 2) * 1.2, 0, 0]) },
  { shape: '[4, 4]', name: '二维矩阵', positions: Array.from({ length: 16 }, (_, i) => [(i % 4 - 1.5) * 1.2, (1.5 - Math.floor(i / 4)) * 1.2, 0]) },
  { shape: '[3, 3, 3]', name: '三维张量', positions: Array.from({ length: 27 }, (_, i) => [(i % 3 - 1) * 1.35, (1 - Math.floor(i / 3) % 3) * 1.35, (Math.floor(i / 9) - 1) * 1.35]) },
]
export function App() {
  const [active, setActive] = useState(2)
  const [epoch, reset] = useState(0)
  const layer = previewLayers[active]
  return <Layout layerCount={3} nodeCount={48}>
    <aside className="panel layer-panel"><PanelHeading icon="layers" title="网络层级" english="NETWORK LAYERS" />
      <nav>{previewLayers.map((item, i) => <button key={item.shape} aria-pressed={active === i} className={'layer-row ' + (active === i ? 'active' : '')} onClick={() => setActive(i)}><span className="layer-icon"><Icon name={i === 2 ? 'cube' : i === 1 ? 'grid' : 'layers'} /></span><span><strong>Layer 0{i + 1}</strong><small>{item.name}</small></span><code>{item.shape}</code></button>)}</nav><Legend />
    </aside>
    <section className="panel viewer"><div className="viewer-head"><div><Icon name="cube" /><strong>张量视图</strong></div><span className="view-tag">3D VIEWPORT</span></div>
      <div className="stage"><div className="scene-hud"><div className="eyebrow">CURRENT LAYER</div><h2>Layer 0{active + 1}</h2><p>{layer.shape} <span>· {layer.positions.length} 个神经元</span></p></div><TensorScene positions={layer.positions as [number, number, number][]} epoch={epoch} /></div>
      <div className="scene-hints"><span><Icon name="orbit" size={14} /> 拖动旋转</span><span><Icon name="zoom" size={14} /> 滚轮缩放</span></div>
      <div className="controlbar"><button onClick={() => reset(epoch + 1)}><Icon name="reset" />重置视角</button></div>
    </section>
    <aside className="panel inspector"><PanelHeading icon="target" title="神经元详情" english="INSPECTOR" /><div className="empty-focus"><Icon name="target" size={32} /><h3>尚未选择神经元</h3></div></aside>
  </Layout>
}
