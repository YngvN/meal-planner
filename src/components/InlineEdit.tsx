import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import './InlineEdit.scss'

interface InlineEditProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Render a textarea instead of a single-line input. */
  multiline?: boolean
  className?: string
  /** aria-label for the edit trigger button. */
  label?: string
}

/** Auto-grows a textarea to fit its content. */
function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/**
 * Shows a value as readable text with a pencil icon.
 * Clicking the text or the icon switches to an editable input/textarea.
 * Starts in edit mode when the value is empty (e.g. new step).
 */
export function InlineEdit({ value, onChange, placeholder, multiline, className, label }: InlineEditProps) {
  const [editing, setEditing] = useState(!value)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep textarea height in sync when switching into edit mode.
  useEffect(() => {
    if (editing && textareaRef.current) autoResize(textareaRef.current)
  }, [editing])

  // Auto-expand on initial render if editing.
  useEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current)
  }, [])

  function handleBlur() {
    // Only collapse to display mode when the field has content.
    if (value.trim()) setEditing(false)
  }

  if (editing) {
    return multiline ? (
      <textarea
        ref={textareaRef}
        className={`inline-edit__textarea ${className ?? ''}`}
        value={value}
        placeholder={placeholder}
        rows={1}
        autoFocus
        onChange={(e) => { onChange(e.target.value); autoResize(e.target) }}
        onBlur={handleBlur}
      />
    ) : (
      <input
        ref={inputRef}
        type="text"
        className={`inline-edit__input ${className ?? ''}`}
        value={value}
        placeholder={placeholder}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
      />
    )
  }

  return (
    <div
      className={`inline-edit ${className ?? ''}`}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditing(true)}
      role="button"
      tabIndex={0}
      aria-label={label ?? 'Edit'}
    >
      {value ? (
        <span className="inline-edit__text">{value}</span>
      ) : (
        <span className="inline-edit__placeholder">{placeholder}</span>
      )}
      <Pencil size={13} aria-hidden className="inline-edit__icon" />
    </div>
  )
}
