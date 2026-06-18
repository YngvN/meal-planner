import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import './Modal.scss'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** 'default' = 480px max-width. 'large' = 800px with scrollable body for complex forms. */
  size?: 'default' | 'large'
}

export function Modal({ open, onClose, title, children, size = 'default' }: ModalProps) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={['modal', size === 'large' && 'modal--large'].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {title && <h3 className="modal__title">{title}</h3>}
        <div className="modal__body">{children}</div>
        <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
          <X size={20} aria-hidden />
        </button>
      </div>
    </div>
  )
}
