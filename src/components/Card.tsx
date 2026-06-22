import { View, Text } from 'react-native'
import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className }: CardProps) {
  return (
    <View className={`bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 gap-3 ${className ?? ''}`}>
      {title && (
        <Text className="text-base font-semibold text-app-text dark:text-text-dark">{title}</Text>
      )}
      <View>{children}</View>
    </View>
  )
}
