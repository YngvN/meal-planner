import { View, Text, Pressable, Modal, ScrollView } from 'react-native'
import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react-native'
import { availableLanguages, useLanguage, type LanguageCode } from '../i18n'

/** Dropdown for switching the active language (see `src/i18n`). */
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const current = availableLanguages.find((l) => l.code === language)

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center gap-2 px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark active:opacity-80"
        accessibilityRole="combobox"
        accessibilityLabel="Language"
      >
        <Text className="text-sm text-app-text dark:text-text-dark">{current?.label ?? language}</Text>
        <ChevronDown size={14} className="text-text-muted dark:text-text-muted-dark" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 bg-overlay dark:bg-overlay-dark justify-end"
          onPress={() => setOpen(false)}
        >
          <Pressable
            className="bg-bg dark:bg-bg-dark rounded-t-2xl border-t border-border dark:border-border-dark"
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView>
              {availableLanguages.map((option) => (
                <Pressable
                  key={option.code}
                  onPress={() => { setLanguage(option.code as LanguageCode); setOpen(false) }}
                  className="flex-row items-center justify-between px-4 py-3.5 border-b border-border dark:border-border-dark active:bg-surface dark:active:bg-surface-dark"
                >
                  <Text className={`text-base ${option.code === language ? 'font-semibold text-accent dark:text-accent-dark' : 'text-app-text dark:text-text-dark'}`}>
                    {option.label}
                  </Text>
                  {option.code === language && (
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
