import { View, Text } from 'react-native'
import type { ReactNode } from 'react'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
}

const containerClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-surface border-border dark:bg-surface-dark dark:border-border-dark',
  success: 'bg-success-bg border-success-border dark:bg-success-bg-dark dark:border-success-border-dark',
  warning: 'bg-warning-bg border-warning-border dark:bg-warning-bg-dark dark:border-warning-border-dark',
  error:   'bg-error-bg border-error-border dark:bg-error-bg-dark dark:border-error-border-dark',
  info:    'bg-info-bg border-info-border dark:bg-info-bg-dark dark:border-info-border-dark',
}

const textClasses: Record<BadgeVariant, string> = {
  neutral: 'text-app-text dark:text-text-dark',
  success: 'text-success dark:text-success-dark',
  warning: 'text-warning dark:text-warning-dark',
  error:   'text-error dark:text-error-dark',
  info:    'text-info dark:text-info-dark',
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <View className={`self-start rounded-full border px-2 py-0.5 ${containerClasses[variant]}`}>
      <Text className={`text-xs font-medium ${textClasses[variant]}`}>{children}</Text>
    </View>
  )
}
