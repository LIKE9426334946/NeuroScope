import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

interface Props {
  eyebrow: string
  title: string
  submitText: string
  disabled?: boolean
  onSubmit: () => void
  onClose: () => void
  children: ReactNode
}

export function ParameterDialog({
  eyebrow,
  title,
  submitText,
  disabled,
  onSubmit,
  onClose,
  children
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const el = dialog.current!
    el.showModal()
    return () => el.close()
  }, [])
  return (
    <dialog ref={dialog} className="shape-dialog" aria-labelledby={titleId} onCancel={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <div className="dialog-title">
          <div className="eyebrow">{eyebrow}</div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <h2 id={titleId}>{title}</h2>
        {children}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="apply-button" disabled={disabled}>
            {submitText}
          </button>
        </div>
      </form>
    </dialog>
  )
}
