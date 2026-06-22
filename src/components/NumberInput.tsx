import { View, Text, Pressable, TextInput } from 'react-native'
import { Minus, Plus } from 'lucide-react-native'
import type { ReactNode } from 'react'

interface NumberInputProps {
  label?: ReactNode
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number | 'any'
  id?: string
  className?: string
  error?: string
}

/**
 * Numeric input with decrement (−) and increment (+) stepper buttons.
 * Clamps the value between min and max when the stepper is used.
 */
export function NumberInput({ label, value, onChange, min = 0, max, step = 1, id, className, error }: NumberInputProps) {
  const numericStep = step === 'any' ? 1 : step

  function clamp(n: number) {
    if (min !== undefined && n < min) return min
    if (max !== undefined && n > max) return max
    return n
  }

  return (
    <View className={`gap-1 ${className ?? ''}`}>
      {label && (
        <Text className="text-sm font-medium text-app-text dark:text-text-dark" nativeID={id}>
          {label}
        </Text>
      )}
      <View className="flex-row items-center border border-border dark:border-border-dark rounded-lg overflow-hidden">
        <Pressable
          onPress={() => onChange(clamp(value - numericStep))}
          disabled={min !== undefined && value <= min}
          className="w-10 h-10 items-center justify-center bg-surface dark:bg-surface-dark active:opacity-70 disabled:opacity-40"
          accessibilityLabel="Decrease"
        >
          <Minus size={16} className="text-app-text dark:text-text-dark" />
        </Pressable>

        <TextInput
          className="flex-1 text-center py-2 text-app-text dark:text-text-dark text-base bg-bg dark:bg-bg-dark"
          value={String(value)}
          onChangeText={(text) => {
            const n = Number(text.replace(/[^0-9.-]/g, ''))
            if (!isNaN(n)) onChange(clamp(n))
          }}
          keyboardType="numeric"
          accessibilityLabelledBy={id}
        />

        <Pressable
          onPress={() => onChange(clamp(value + numericStep))}
          disabled={max !== undefined && value >= max}
          className="w-10 h-10 items-center justify-center bg-surface dark:bg-surface-dark active:opacity-70 disabled:opacity-40"
          accessibilityLabel="Increase"
        >
          <Plus size={16} className="text-app-text dark:text-text-dark" />
        </Pressable>
      </View>
      {error && <Text className="text-xs text-error dark:text-error-dark">{error}</Text>}
    </View>
  )
}
