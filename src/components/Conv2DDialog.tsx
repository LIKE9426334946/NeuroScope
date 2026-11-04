import { useState } from 'react'
import { createConv2D } from '../operations/conv2d.js'
import { layerName } from '../network/layers'
import { formatShape } from '../tensor/layout'
import type { Conv2DParameters, Layer, Operation, Pair } from '../types/network'
import { ParameterDialog } from './ParameterDialog'

const fields = {
  out_channels: '输出通道',
  groups: '分组数',
  kernel_size: '卷积核',
  stride: '步长',
  padding: '零填充',
  dilation: '膨胀率'
} as const
type Draft = Record<keyof typeof fields, string>
const initial: Draft = {
  out_channels: '8',
  groups: '1',
  kernel_size: '3',
  stride: '1',
  padding: '0',
  dilation: '1'
}

function spatial(text: string, field: string): number | Pair {
  const clean = text
    .trim()
    .replace(/^\[([^\[\]]+)\]$/, '$1')
    .trim()
  if (!/^\d+(?:\s*[,，x×]\s*\d+)?$/i.test(clean)) {
    throw new Error(field + ' 需要一个整数或一对整数，例如 3 或 2, 3。')
  }
  const [h, w] = clean.split(/[,，x×]/i).map(Number)
  return w === undefined ? h : [h, w]
}

function preview(input: Layer, draft: Draft): { op?: Operation; error?: string } {
  try {
    return {
      op: createConv2D(input, {
        in_channels: input.shape[0],
        out_channels: Number(draft.out_channels),
        groups: Number(draft.groups),
        kernel_size: spatial(draft.kernel_size, 'kernel_size'),
        stride: spatial(draft.stride, 'stride'),
        padding: spatial(draft.padding, 'padding'),
        dilation: spatial(draft.dilation, 'dilation')
      })
    }
  } catch (reason) {
    return { error: (reason as Error).message }
  }
}

export function Conv2DDialog({
  input,
  onApply,
  onClose
}: {
  input: Layer
  onApply: (params: Conv2DParameters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [submitError, setSubmitError] = useState('')
  const { op, error } = preview(input, draft)
  function add() {
    if (!op) return
    try {
      onApply(op.parameters)
      onClose()
    } catch (reason) {
      setSubmitError((reason as Error).message)
    }
  }
  return (
    <ParameterDialog
      eyebrow="OPERATION · CONV2D"
      title="添加 Conv2D 运算"
      submitText="生成输出层"
      disabled={!op}
      onSubmit={add}
      onClose={onClose}
    >
      <p>
        追加到 {layerName(input.id)} · <code>{formatShape(input.shape)}</code>
      </p>
      <div className="conv-fields">
        <label className="conv-input-channels" htmlFor="conv-in_channels">
          输入通道 <code>in_channels</code>
          <input id="conv-in_channels" value={input.shape[0]} readOnly />
        </label>
        {(Object.keys(fields) as (keyof typeof fields)[]).map((key) => (
          <label key={key} htmlFor={'conv-' + key}>
            {fields[key]} <code>{key}</code>
            <input
              id={'conv-' + key}
              autoComplete="off"
              value={draft[key]}
              onChange={(e) => {
                setDraft({ ...draft, [key]: e.target.value })
                setSubmitError('')
              }}
            />
          </label>
        ))}
      </div>
      <p className="conv-help">卷积核、步长、填充和膨胀率可填写一个整数，或按高、宽填写两个整数。</p>
      {op && (
        <p className="shape-preview" aria-live="polite">
          输出 Shape <strong>{formatShape(op.output.shape)}</strong> · {op.output.count.toLocaleString()}{' '}
          个神经元
        </p>
      )}
      {(submitError || error) && (
        <p className="form-error" role="alert">
          {submitError || error}
        </p>
      )}
    </ParameterDialog>
  )
}
