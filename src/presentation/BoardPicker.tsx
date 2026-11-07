import { useState, type FormEvent } from 'react'
import { layerName } from '../network/layers'
import { formatShape } from '../tensor/layout'
import { Icon } from '../components/Icon'
import type { Layer, NodeRef } from '../types/network'

interface Props {
  layers: Layer[]
  chosen: number[]
  required: Set<number>
  pins: NodeRef[]
  onLayers: (ids: number[]) => void
  onPins: (layer: number, indices: number[], pinned: boolean) => Promise<boolean>
  onClose: () => void
}
export function BoardPicker({ layers, chosen, required, pins, onLayers, onPins, onClose }: Props) {
  const [id, setId] = useState(layers[0].id)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const layer = layers.find((item) => item.id === id) ?? layers[0]
  async function submit(e: FormEvent) {
    e.preventDefault()
    const tokens = text.trim().split(/[\s,，]+/)
    const indices = [...new Set(tokens.map(Number))]
    if (!tokens.every((t) => /^\d+$/.test(t)) || indices.some((i) => i >= layer.count)) {
      setError(`请输入 0 至 ${layer.count - 1} 的编号，多个编号用逗号分隔。`)
      return
    }
    if (await onPins(layer.id, indices, true)) {
      setText('')
      setError('')
    } else setError('添加失败，请检查该层后重试。')
  }
  return (
    <section role="dialog" aria-label="选择展示内容" className="board-picker">
      <div className="picker-head">
        <strong>选择神经元</strong>
        <button aria-label="关闭选择面板" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="pick-layer">网络层</label>
        <select
          id="pick-layer"
          value={layer.id}
          onChange={(e) => {
            setId(Number(e.target.value))
            setError('')
          }}
        >
          {layers.map((l) => (
            <option key={l.id} value={l.id}>
              {layerName(l.id)} · {formatShape(l.shape)}
            </option>
          ))}
        </select>
        <label htmlFor="pick-ids">神经元编号</label>
        <div className="pick-input">
          <input
            id="pick-ids"
            autoComplete="off"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
            }}
            placeholder={'0–' + (layer.count - 1) + '，可输入多个'}
          />
          <button type="submit">添加</button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      {pins.length > 0 && (
        <div className="pick-chips">
          {pins.map((n) => (
            <button
              key={n.layer + '-' + n.index}
              title={'移除 ' + layerName(n.layer) + ' #' + n.index}
              aria-label={'移除 ' + layerName(n.layer) + ' #' + n.index}
              onClick={() => void onPins(n.layer, [n.index], false)}
            >
              L{n.layer} #{n.index}
              <Icon name="close" size={11} />
            </button>
          ))}
        </div>
      )}
      <fieldset>
        <legend>整层视图</legend>
        {layers.map((l) => (
          <label key={l.id} title={required.has(l.id) ? '正在跟随管理端' : undefined}>
            <input
              type="checkbox"
              checked={chosen.includes(l.id) || required.has(l.id)}
              disabled={required.has(l.id)}
              onChange={(e) =>
                onLayers(e.target.checked ? [...chosen, l.id] : chosen.filter((i) => i !== l.id))
              }
            />
            {layerName(l.id)} {required.has(l.id) && <small>跟随</small>}
          </label>
        ))}
      </fieldset>
    </section>
  )
}
