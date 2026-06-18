import type { ReactNode } from 'react'
import './NumberInput.scss'

interface NumberInputProps {
  label?: ReactNode
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  id?: string
  className?: string
  error?: string
}

/**
 * Numeric input with decrement (−) and increment (+) stepper buttons.
 * Clamps the value between min and max when the stepper is used.
 */
export function NumberInput({ label, value, onChange, min = 0, max, step = 1, id, className, error }: NumberInputProps) {
  function clamp(n: number) {
    if (min !== undefined && n < min) return min
    if (max !== undefined && n > max) return max
    return n
  }

  return (
    <div className={['number-input-field', className].filter(Boolean).join(' ')}>
      {label && <label htmlFor={id}>{label}</label>}
      <div className="number-input">
        <button
          type="button"
          className="number-input__step"
          onClick={() => onChange(clamp(value - step))}
          aria-label="Decrease"
          disabled={min !== undefined && value <= min}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          className="number-input__field"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
        />
        <button
          type="button"
          className="number-input__step"
          onClick={() => onChange(clamp(value + step))}
          aria-label="Increase"
          disabled={max !== undefined && value >= max}
        >
          +
        </button>
      </div>
      {error && <p className="number-input-field__error">{error}</p>}
    </div>
  )
}
