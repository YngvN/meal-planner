import { View, TextInput, Pressable } from 'react-native'
import { Search, X } from 'lucide-react-native'

interface SearchBarProps {
  /** Current search value. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Search input with a clear (×) button.
 * Calls onChange with the new string value on every keystroke.
 */
export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  return (
    <View className={`flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg px-3 gap-2 ${className ?? ''}`}>
      <Search size={16} className="text-text-muted dark:text-text-muted-dark" />
      <TextInput
        className="flex-1 py-2.5 text-base text-app-text dark:text-text-dark"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#6b6375"
        returnKeyType="search"
      />
      {!!value && (
        <Pressable onPress={() => onChange('')} accessibilityLabel="Clear search" className="active:opacity-70">
          <X size={16} className="text-text-muted dark:text-text-muted-dark" />
        </Pressable>
      )}
    </View>
  )
}
