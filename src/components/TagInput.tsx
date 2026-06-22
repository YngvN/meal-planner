import { View, Text, TextInput, Pressable, ScrollView } from 'react-native'
import { useState } from 'react'
import { X } from 'lucide-react-native'

interface TagInputProps {
  label?: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

/**
 * Multi-value freeform tag input.
 * Press the return key or type a comma to add a tag; tap × on a tag to remove it.
 */
export function TagInput({ label, tags, onChange, placeholder = 'Add tag…', className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInputValue('')
  }

  function handleSubmitEditing() {
    addTag(inputValue)
  }

  function handleChangeText(text: string) {
    // Add tag on comma.
    if (text.endsWith(',')) {
      addTag(text.slice(0, -1))
    } else {
      setInputValue(text)
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <View className={`gap-1 ${className ?? ''}`}>
      {label && (
        <Text className="text-sm font-medium text-app-text dark:text-text-dark">{label}</Text>
      )}
      <View className="flex-row flex-wrap gap-1.5 border border-border dark:border-border-dark rounded-lg p-2 bg-bg dark:bg-bg-dark min-h-[44px]">
        {tags.map((tag) => (
          <View key={tag} className="flex-row items-center gap-1 bg-surface dark:bg-surface-dark rounded-full px-2 py-0.5">
            <Text className="text-sm text-app-text dark:text-text-dark">{tag}</Text>
            <Pressable onPress={() => removeTag(tag)} accessibilityLabel={`Remove ${tag}`} className="active:opacity-70">
              <X size={12} className="text-text-muted dark:text-text-muted-dark" />
            </Pressable>
          </View>
        ))}
        <TextInput
          className="flex-1 min-w-[80px] text-sm text-app-text dark:text-text-dark py-0.5"
          value={inputValue}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmitEditing}
          onBlur={() => addTag(inputValue)}
          placeholder={tags.length === 0 ? placeholder : ''}
          placeholderTextColor="#6b6375"
          returnKeyType="done"
          blurOnSubmit={false}
        />
      </View>
    </View>
  )
}
