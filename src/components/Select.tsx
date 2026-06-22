import { View, Text, Modal, Pressable, ScrollView, Platform } from 'react-native'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react-native'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: ReactNode
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * Styled select dropdown.
 * On web: renders a native <select> element (react-native-web handles this).
 * On native: shows a modal with a scrollable options list.
 */
export function Select({ label, options, value, onChange, placeholder, error, disabled, id, className }: SelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  // On web, react-native-web renders View/Text/TextInput as DOM elements,
  // but there's no native <select> equivalent — use the Pressable modal approach
  // on all platforms for consistency.

  return (
    <View className={`gap-1 ${className ?? ''}`}>
      {label && (
        <Text className="text-sm font-medium text-app-text dark:text-text-dark" nativeID={id}>
          {label}
        </Text>
      )}

      {/* Trigger */}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`flex-row items-center justify-between px-3 py-2.5 rounded-lg border bg-bg dark:bg-bg-dark ${
          error
            ? 'border-error dark:border-error-dark'
            : 'border-border dark:border-border-dark'
        } ${disabled ? 'opacity-50' : 'active:opacity-80'}`}
        accessibilityRole="combobox"
        accessibilityLabelledBy={id}
      >
        <Text className={`text-base ${selected ? 'text-app-text dark:text-text-dark' : 'text-text-muted dark:text-text-muted-dark'}`}>
          {selected?.label ?? placeholder ?? 'Select…'}
        </Text>
        <ChevronDown size={16} className="text-text-muted dark:text-text-muted-dark" />
      </Pressable>

      {error && <Text className="text-xs text-error dark:text-error-dark">{error}</Text>}

      {/* Options modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-overlay dark:bg-overlay-dark justify-end"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="bg-bg dark:bg-bg-dark rounded-t-2xl border-t border-border dark:border-border-dark max-h-80"
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {placeholder && (
                <Pressable
                  className="flex-row items-center px-4 py-3.5 border-b border-border dark:border-border-dark opacity-50"
                  onPress={() => { onChange?.(''); setOpen(false) }}
                >
                  <Text className="text-base text-text-muted dark:text-text-muted-dark">{placeholder}</Text>
                </Pressable>
              )}
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => { onChange?.(option.value); setOpen(false) }}
                  className="flex-row items-center justify-between px-4 py-3.5 border-b border-border dark:border-border-dark active:bg-surface dark:active:bg-surface-dark"
                >
                  <Text className={`text-base ${option.value === value ? 'font-semibold text-accent dark:text-accent-dark' : 'text-app-text dark:text-text-dark'}`}>
                    {option.label}
                  </Text>
                  {option.value === value && (
                    <Check size={16} className="text-accent dark:text-accent-dark" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
