import { Pressable, View, Text } from 'react-native'
import { Check } from 'lucide-react-native'

interface CheckboxProps {
  label: string
  checked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
}

/** Pressable checkbox with a label. */
export function Checkbox({ label, checked = false, onChange, disabled }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      className="flex-row items-center gap-2"
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View
        className={`w-5 h-5 rounded border-2 items-center justify-center ${
          checked
            ? 'bg-accent border-accent dark:bg-accent-dark dark:border-accent-dark'
            : 'border-border dark:border-border-dark bg-bg dark:bg-bg-dark'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        {checked && <Check size={12} color="#ffffff" />}
      </View>
      <Text className="text-sm text-app-text dark:text-text-dark">{label}</Text>
    </Pressable>
  )
}
