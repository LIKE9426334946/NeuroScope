import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Layout({
  children,
  layerCount,
  nodeCount,
  source
}: {
  children: ReactNode
  layerCount: number
  nodeCount: number
  source: string
}) {
  return (
    <div className="shell">
      <header className="appbar flex items-center justify-between">
        <div className="brand flex items-center">
          <img src="/neuroscope.svg" alt="" width="37" height="37" />
          <span>
            Neuro<span className="brand-strong">Scope</span>
          </span>
          <i className="header-divider" />
          <span className="brand-context">神经网络可视化</span>
        </div>
        <div className="header-status">
          <span className="live-dot" />
          {source}
          <span className="header-divider" />
          <span className="mono version">v1.0</span>
        </div>
      </header>
      <main>
        <section className="page-heading">
          <div>
            <div className="eyebrow title-kicker">
              <span /> TOPOLOGY WORKSPACE
            </div>
            <h1>拓扑探索器</h1>
            <p>逐层观察 Tensor，探索神经元之间的上下游关系。</p>
          </div>
          <div className="overview">
            <div>
              <strong>{String(layerCount).padStart(2, '0')}</strong>
              <span>网络层</span>
            </div>
            <i />
            <div>
              <strong>{nodeCount.toLocaleString()}</strong>
              <span>神经元</span>
            </div>
          </div>
        </section>
        <div className="workbench">{children}</div>
      </main>
    </div>
  )
}

export function PanelHeading({
  icon,
  title,
  english
}: {
  icon: 'layers' | 'target' | 'cube'
  title: string
  english: string
}) {
  return (
    <div className="panel-title">
      <div className="eyebrow">{english}</div>
      <h2>
        <Icon name={icon} size={19} />
        {title}
      </h2>
    </div>
  )
}

export function Legend() {
  return (
    <div className="legend">
      <div className="eyebrow">COLOR KEY</div>
      <h3>节点图例</h3>
      <div>
        <i className="swatch normal" />
        普通神经元
      </div>
      <div>
        <i className="swatch selected" />
        当前选中
      </div>
      <div>
        <i className="swatch related" />
        关联神经元
      </div>
    </div>
  )
}
