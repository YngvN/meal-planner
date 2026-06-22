import { View, Text, TextInput } from 'react-native'
import type { ReactNode } from 'react'

interface InputProps {
  label?: ReactNode
  error?: string
  id?: string
  placeholder?: string
  value?: string
  onChangeText?: (text: string) => void
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoComplete?: 'email' | 'password' | 'username' | 'off' | 'name'
  editable?: boolean
  multiline?: boolean
  className?: string
  onBlur?: () => void
  onFocus?: () => void
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send'
  onSubmitEditing?: () => void
}

export function Input({ label, error, id, className, ...props }: InputProps) {
  return (
    <View className={`gap-1 ${className ?? ''}`}>
      {label && (
        <Text className="text-sm font-medium text-app-text dark:text-text-dark" nativeID={id}>
          {label}
        </Text>
      )}
      <TextInput
        className={`bg-bg dark:bg-bg-dark border rounded-lg px-3 py-2.5 text-app-text dark:text-text-dark text-base ${
          error
            ? 'border-error dark:border-error-dark'
            : 'border-border dark:border-border-dark'
        }`}
        placeholderTextColor="#6b6375"
        accessibilityLabelledBy={id}
        {...props}
      />
      {error && (
        <Text className="text-xs text-error dark:text-error-dark">{error}</Text>
      )}
    </View>
  )
}
