import type { ReactNode } from 'react'
import './FilterChip.scss'

interface FilterChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Toggleable filter chip.
 * Shows an active/filled state when `active` is true, outline when inactive.
 */
export function FilterChip({ children, active = false, onClick, className }: FilterChipProps) {
  return (
    <button
      type="button"
      className={['filter-chip', active && 'filter-chip--active', className].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}
