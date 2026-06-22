import { View, Text, TextInput, Pressable, FlatList, Modal } from 'react-native'
import { useState, useMemo } from 'react'
import { Image } from 'expo-image'
import { Plus, Trash2 } from 'lucide-react-native'
import type { Ingredient } from '../features/ingredients/types'

interface IngredientComboboxProps {
  /** Currently selected ingredient id. */
  value: string | undefined
  onChange: (ingredientId: string) => void
  options: Ingredient[]
  /**
   * Called when the user types a name that doesn't exist and confirms.
   * Should dispatch createIngredient and return the new ingredient's id.
   */
  onCreateNew: (name: string) => Promise<string>
  placeholder?: string
  className?: string
}

/**
 * Search-as-you-type ingredient selector.
 * Tapping the field opens a bottom-sheet modal with live search.
 * If no match exists for the typed text, a "Create" option appears.
 */
export function IngredientCombobox({
  value,
  onChange,
  options,
  onCreateNew,
  placeholder = 'Search ingredients…',
  className,
}: IngredientComboboxProps) {
  const selected = options.find((o) => o.id === value)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  )

  const showCreate =
    query.trim().length > 0 &&
    !options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase())

  function handleSelect(ingredient: Ingredient) {
    onChange(ingredient.id)
    setQuery('')
    setOpen(false)
  }

  function handleClear() {
    onChange('')
  }

  async function handleCreate() {
    const name = query.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const id = await onCreateNew(name)
      onChange(id)
      setQuery('')
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <View className={className}>
      {selected ? (
        // Selected state — show thumbnail + name + clear button.
        <View className="flex-row items-center gap-2 border border-border dark:border-border-dark rounded-lg px-3 py-2 bg-bg dark:bg-bg-dark">
          {selected.imageUrl && (
            <Image
              source={{ uri: selected.imageUrl }}
              style={{ width: 28, height: 28, borderRadius: 4 }}
              contentFit="cover"
            />
          )}
          <Text className="flex-1 text-base text-app-text dark:text-text-dark">
            {selected.name}
          </Text>
          <Pressable onPress={handleClear} accessibilityLabel="Clear selection" className="active:opacity-70 p-1">
            <Trash2 size={15} className="text-text-muted dark:text-text-muted-dark" />
          </Pressable>
        </View>
      ) : (
        // Tap to open search modal.
        <Pressable
          onPress={() => setOpen(true)}
          className="border border-border dark:border-border-dark rounded-lg px-3 py-2.5 bg-bg dark:bg-bg-dark active:opacity-80"
          accessibilityRole="combobox"
        >
          <Text className="text-base text-text-muted dark:text-text-muted-dark">{placeholder}</Text>
        </Pressable>
      )}

      {/* Search modal */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-bg dark:bg-bg-dark">
          {/* Search bar */}
          <View className="px-4 pt-4 pb-2 border-b border-border dark:border-border-dark">
            <TextInput
              className="bg-surface dark:bg-surface-dark rounded-lg px-3 py-2.5 text-base text-app-text dark:text-text-dark"
              placeholder={placeholder}
              placeholderTextColor="#6b6375"
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                className="flex-row items-center gap-3 px-4 py-3 border-b border-border dark:border-border-dark active:bg-surface dark:active:bg-surface-dark"
              >
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 36, height: 36, borderRadius: 6 }}
                    contentFit="cover"
                  />
                )}
                <View className="flex-1">
                  <Text className="text-base text-app-text dark:text-text-dark">{item.name}</Text>
                  {item.category && (
                    <Text className="text-xs text-text-muted dark:text-text-muted-dark mt-0.5">{item.category}</Text>
                  )}
                </View>
              </Pressable>
            )}
            ListHeaderComponent={
              showCreate ? (
                <Pressable
                  onPress={handleCreate}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-border dark:border-border-dark active:bg-surface dark:active:bg-surface-dark"
                >
                  <View className="w-9 h-9 rounded-full bg-accent dark:bg-accent-dark items-center justify-center">
                    <Plus size={18} color="#ffffff" />
                  </View>
                  <Text className="text-base text-accent dark:text-accent-dark">
                    {creating ? 'Creating…' : `Create "${query.trim()}"`}
                  </Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              !showCreate ? (
                <Text className="text-center py-8 text-text-muted dark:text-text-muted-dark">
                  No ingredients found
                </Text>
              ) : null
            }
          />
        </View>
      </Modal>
    </View>
  )
}
