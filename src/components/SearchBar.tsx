import type { ChangeEvent } from 'react'
import './SearchBar.scss'

interface SearchBarProps {
  /** Current search value. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Search input with a clear (×) button.
 * Calls onChange with the new string value on every keystroke.
 */
export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  return (
    <div className={['search-bar', className].filter(Boolean).join(' ')}>
      <span className="search-bar__icon" aria-hidden>🔍</span>
      <input
        type="search"
        className="search-bar__input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  )
}
