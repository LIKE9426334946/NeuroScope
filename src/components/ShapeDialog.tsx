import { useState } from 'react'
import type { Layer, Shape } from '../types/network'
import { parseShape } from '../tensor/layout'
import { ParameterDialog } from './ParameterDialog'

export function ShapeDialog({
  layer,
  onApply,
  onClose
}: {
  layer: Layer
  onApply: (shape: Shape) => void
  onClose: () => void
}) {
  const [text, setText] = useState(layer.shape.join(', '))
  const [error, setError] = useState('')
  function apply() {
    try {
      onApply(parseShape(text))
      onClose()
    } catch (reason) {
      setError((reason as Error).message)
    }
  }
  return (
    <ParameterDialog
      eyebrow="INPUT TENSOR"
      title="调整输入 Tensor Shape"
      submitText="应用 Shape"
      onSubmit={apply}
      onClose={onClose}
    >
      <p>支持 1 至 3 个维度，每个维度为 1–30。Conv2D 使用 [C, H, W]。</p>
      <label htmlFor="shape-input">输入 Shape</label>
      <input
        id="shape-input"
        autoFocus
        autoComplete="off"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setError('')
        }}
        aria-describedby="shape-note"
      />
      <p id="shape-note">应用后会重新推导所有输出层。若现有卷积不适用于新输入，可先移除末尾运算。</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </ParameterDialog>
  )
}
