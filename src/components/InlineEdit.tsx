import { View, Text, TextInput, Pressable } from 'react-native'
import { useState } from 'react'
import { Pencil } from 'lucide-react-native'

interface InlineEditProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Render a multi-line input instead of a single line. */
  multiline?: boolean
  className?: string
  /** Accessibility label for the edit trigger. */
  label?: string
}

/**
 * Shows a value as readable text with a pencil icon.
 * Tapping the text or icon switches to an editable TextInput.
 * Starts in edit mode when the value is empty (e.g. new step).
 */
export function InlineEdit({ value, onChange, placeholder, multiline, className, label }: InlineEditProps) {
  const [editing, setEditing] = useState(!value)

  function handleBlur() {
    if (value.trim()) setEditing(false)
  }

  if (editing) {
    return (
      <TextInput
        className={`border border-accent dark:border-accent-dark rounded-lg px-3 py-2 text-base text-app-text dark:text-text-dark bg-bg dark:bg-bg-dark ${className ?? ''}`}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6b6375"
        multiline={multiline}
        autoFocus
        onBlur={handleBlur}
        returnKeyType={multiline ? 'default' : 'done'}
      />
    )
  }

  return (
    <Pressable
      onPress={() => setEditing(true)}
      className={`flex-row items-start gap-2 ${className ?? ''}`}
      accessibilityLabel={label ?? 'Edit'}
      accessibilityRole="button"
    >
      <Text className="flex-1 text-base text-app-text dark:text-text-dark">
        {value || <Text className="text-text-muted dark:text-text-muted-dark">{placeholder}</Text>}
      </Text>
      <Pencil size={13} className="text-text-muted dark:text-text-muted-dark mt-0.5" />
    </Pressable>
  )
}
