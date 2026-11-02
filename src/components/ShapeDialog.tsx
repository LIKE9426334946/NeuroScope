import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Layer, Shape } from '../types/network'
import { parseShape } from '../tensor/layout'
import { layerName } from '../network/layers'
import { Icon } from './Icon'

export function ShapeDialog({ layer, onApply, onClose }: { layer: Layer; onApply: (shape: Shape) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [text, setText] = useState(layer.shape.join(', '))
  const [error, setError] = useState('')
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const shape = parseShape(text)
      onApply(shape)
      onClose()
    } catch (reason) { setError((reason as Error).message) }
  }
  return <dialog ref={dialog} className="shape-dialog" aria-labelledby="shape-title" onCancel={onClose}>
    <form onSubmit={submit}>
      <div className="dialog-title"><div className="eyebrow">TENSOR SHAPE</div><button type="button" aria-label="关闭" onClick={onClose}><Icon name="close" /></button></div>
      <h2 id="shape-title">调整 {layerName(layer.id)} 的 Shape</h2>
      <p>输入 1 至 3 个维度，每个维度的长度为 1–30。</p>
      <label htmlFor="shape-input">Tensor Shape</label>
      <input id="shape-input" autoFocus autoComplete="off" value={text} onChange={e => { setText(e.target.value); setError('') }} aria-describedby="shape-note" />
      <p id="shape-note">例如 3, 4, 5 会生成 60 个球体。修改后将重建模拟连接。</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" onClick={onClose}>取消</button><button className="apply-button" type="submit">应用 Shape</button></div>
    </form>
  </dialog>
}
