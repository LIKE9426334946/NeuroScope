import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'
import { PanelHeading } from './Layout'
import { layerName } from '../network/layers'
import { formatShape, indexToCoords } from '../tensor/layout'
import type { Direction, Layer, NodeRef } from '../types/network'

export const directionNames: Record<Direction, string> = { self: '当前层', upstream: '上一层 · 上游', downstream: '下一层 · 下游' }
interface Props {
  layer: Layer
  anchor: Layer | null
  selected: NodeRef | null
  direction: Direction
  related: readonly number[]
  upstream: number
  downstream: number
  onSelect: (index: number) => void
  onReturn: () => void
}

function IndexFinder({ layer, onSelect }: Pick<Props, 'layer' | 'onSelect'>) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  function locate(event: FormEvent) {
    event.preventDefault()
    if (!/^\d+$/.test(value) || Number(value) >= layer.count) {
      setError('请输入 0 至 ' + (layer.count - 1) + ' 的编号。')
      return
    }
    setError('')
    onSelect(Number(value))
  }
  return <form className="index-form" onSubmit={locate}>
    <label htmlFor="index-input"><Icon name="hash" size={14} />按编号选择</label>
    <div><input id="index-input" autoComplete="off" inputMode="numeric" value={value} placeholder={'0 – ' + (layer.count - 1)} onChange={e => { setValue(e.target.value); setError('') }} /><button type="submit" aria-label="选择此编号" title="选择此编号"><Icon name="arrow" size={16} /></button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>
}

export function Inspector({ layer, anchor, selected, direction, related, upstream, downstream, onSelect, onReturn }: Props) {
  const observing = direction !== 'self'
  return <aside className="panel inspector">
    <PanelHeading icon="target" title="神经元详情" english="INSPECTOR" />
    <div className="inspector-content">
      {selected && anchor ? <div className="anchor-card"><div className="eyebrow"><i className="live-dot" /> SELECTED NEURON</div><strong>Neuron #{selected.index}</strong><span>{layerName(anchor.id)}</span></div> :
        <div className="empty-focus"><span className="reticle"><Icon name="target" size={29} /></span><h3>尚未选择神经元</h3><p>点击画布中的球体<br />查看它的索引与连接关系</p></div>}
      <dl className="properties" aria-live="polite">
        <div><dt>所选层</dt><dd>{anchor ? layerName(anchor.id) : '—'}</dd></div>
        <div><dt>神经元编号</dt><dd>{selected ? '#' + selected.index : '—'}</dd></div>
        <div><dt>Tensor Shape</dt><dd>{anchor ? formatShape(anchor.shape) : '—'}</dd></div>
        <div><dt>多维索引</dt><dd>{anchor && selected ? '[' + indexToCoords(anchor.shape, selected.index).join(', ') + ']' : '—'}</dd></div>
        <div><dt>观察方向</dt><dd>{directionNames[direction]}</dd></div>
        <div><dt>当前关联数</dt><dd className={observing ? 'related-text' : ''}>{selected ? related.length : '—'}</dd></div>
      </dl>
      {selected && <div className="relation-detail">
        <div className="eyebrow">CONNECTIONS</div>
        {observing ? <><h3>{related.length ? '关联神经元' : '本方向没有关联神经元'}</h3>
          {related.length > 0 && <div className="related-chips">{related.slice(0, 12).map(id => <button key={id} onClick={() => onSelect(id)} aria-label={'选择关联神经元 ' + id}>#{id}</button>)}{related.length > 12 && <small>+{related.length - 12}</small>}</div>}
          <button className="return-button" onClick={onReturn}><Icon name="left" size={14} />返回所选层</button></> :
          <p className="counts">上游 <b>{upstream}</b><span />下游 <b>{downstream}</b></p>}
      </div>}
    </div>
    <IndexFinder key={layer.id + ':' + layer.shape.join(',')} layer={layer} onSelect={onSelect} />
  </aside>
}
