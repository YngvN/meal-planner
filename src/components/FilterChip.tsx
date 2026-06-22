import { Pressable, Text } from 'react-native'
import type { ReactNode } from 'react'

interface FilterChipProps {
  children: ReactNode
  active?: boolean
  onPress?: () => void
  className?: string
}

/**
 * Toggleable filter chip.
 * Shows an accent-filled state when `active` is true, outline when inactive.
 */
export function FilterChip({ children, active = false, onPress, className }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full border text-sm font-medium active:opacity-75 ${
        active
          ? 'bg-accent border-accent dark:bg-accent-dark dark:border-accent-dark'
          : 'bg-transparent border-border dark:border-border-dark'
      } ${className ?? ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text className={`text-sm font-medium ${active ? 'text-accent-contrast dark:text-accent-contrast-dark' : 'text-app-text dark:text-text-dark'}`}>
        {children}
      </Text>
    </Pressable>
  )
}
