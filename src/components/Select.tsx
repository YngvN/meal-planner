import type { ReactNode, SelectHTMLAttributes } from 'react'
import './Select.scss'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: ReactNode
  options: SelectOption[]
  placeholder?: string
  error?: string
}

/**
 * Styled select dropdown with optional label and error message.
 * Pass a placeholder to show an unselectable first option.
 */
export function Select({ label, options, placeholder, error, id, className, ...props }: SelectProps) {
  const classes = ['select', error && 'select--error', className].filter(Boolean).join(' ')

  return (
    <div className="select-field">
      {label && <label htmlFor={id}>{label}</label>}
      <select id={id} className={classes} {...props}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="select-field__error">{error}</p>}
    </div>
  )
}
