import { Pressable, Text, ActivityIndicator } from 'react-native'
import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  children: ReactNode
  className?: string
  /** Web/accessibility: "button" (default) | "submit" | "reset" */
  type?: 'button' | 'submit' | 'reset'
}

const baseClasses = 'flex-row items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold'

const variantClasses: Record<'primary' | 'secondary', string> = {
  primary:   'bg-accent dark:bg-accent-dark active:opacity-80',
  secondary: 'bg-surface border border-border dark:bg-surface-dark dark:border-border-dark active:opacity-80',
}

const textClasses: Record<'primary' | 'secondary', string> = {
  primary:   'text-accent-contrast dark:text-accent-contrast-dark font-semibold',
  secondary: 'text-app-text dark:text-text-dark font-semibold',
}

export function Button({ variant = 'primary', onPress, disabled, loading, children, className }: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      accessibilityRole="button"
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#ffffff' : undefined}
        />
      )}
      {typeof children === 'string' ? (
        <Text className={textClasses[variant]}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
