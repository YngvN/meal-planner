import { View, Text } from 'react-native'
import type { ReactNode } from 'react'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
}

const variantClasses: Record<AlertVariant, string> = {
  info:    'bg-info-bg border-info-border dark:bg-info-bg-dark dark:border-info-border-dark',
  success: 'bg-success-bg border-success-border dark:bg-success-bg-dark dark:border-success-border-dark',
  warning: 'bg-warning-bg border-warning-border dark:bg-warning-bg-dark dark:border-warning-border-dark',
  error:   'bg-error-bg border-error-border dark:bg-error-bg-dark dark:border-error-border-dark',
}

const titleClasses: Record<AlertVariant, string> = {
  info:    'text-info dark:text-info-dark',
  success: 'text-success dark:text-success-dark',
  warning: 'text-warning dark:text-warning-dark',
  error:   'text-error dark:text-error-dark',
}

export function Alert({ variant = 'info', title, children }: AlertProps) {
  return (
    <View
      className={`rounded-lg border p-3 gap-1 ${variantClasses[variant]}`}
      accessibilityRole="alert"
    >
      {title && (
        <Text className={`font-semibold text-sm ${titleClasses[variant]}`}>{title}</Text>
      )}
      <View>{children}</View>
    </View>
  )
}
