import type { KeyboardEvent } from 'react'
import { useState } from 'react'
import { X } from 'lucide-react'
import './TagInput.scss'

interface TagInputProps {
  label?: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

/**
 * Multi-value freeform tag input.
 * Press Enter or comma to add a tag; click × on a tag to remove it.
 */
export function TagInput({ label, tags, onChange, placeholder = 'Add tag…', className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInputValue('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className={['tag-input-field', className].filter(Boolean).join(' ')}>
      {label && <span className="tag-input-field__label">{label}</span>}
      <div className="tag-input">
        {tags.map((tag) => (
          <span key={tag} className="tag-input__tag">
            {tag}
            <button
              type="button"
              className="tag-input__remove"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              <X size={14} aria-hidden />
            </button>
          </span>
        ))}
        <input
          type="text"
          className="tag-input__input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputValue)}
          placeholder={tags.length === 0 ? placeholder : ''}
        />
      </div>
    </div>
  )
}
