import { useState } from 'react'
import { View, Text, FlatList } from 'react-native'
import { Image } from 'expo-image'
import { Button, Modal, SearchBar } from '../../../components'
import { useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import type { MealSlot } from '../types'

interface RecipePickerProps {
  /** The date string (YYYY-MM-DD) being assigned. */
  date: string
  /** The slot being assigned. */
  slot: MealSlot
  onPick: (recipeId: string) => void
  onClose: () => void
}

/**
 * Modal that lets the user search and pick a recipe to assign to a date + slot.
 */
export function RecipePicker({ date, slot, onPick, onClose }: RecipePickerProps) {
  const { t, language } = useLanguage()
  const recipes = useAppSelector((s) => s.recipes.items)
  const [search, setSearch] = useState('')

  const filtered = recipes.filter((r) => {
    const term = search.toLowerCase()
    return (
      r.title.toLowerCase().includes(term) ||
      (r.titleI18n?.[language]?.toLowerCase().includes(term) ?? false)
    )
  })

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t(`mealPlan.slot.${slot}`)} — ${dateLabel}`}
    >
      <View className="gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder={t('recipes.search')} />

        {filtered.length === 0 ? (
          <Text className="text-sm text-text-muted dark:text-text-muted-dark text-center py-4">
            {t('recipes.noResults')}
          </Text>
        ) : (
          <View className="gap-2">
            {filtered.map((recipe) => (
              <View key={recipe.id} className="flex-row items-center gap-3 bg-surface dark:bg-surface-dark rounded-xl p-3 border border-border dark:border-border-dark">
                {recipe.imageUrl && (
                  <Image
                    source={{ uri: recipe.imageUrl }}
                    style={{ width: 48, height: 48, borderRadius: 8 }}
                    contentFit="cover"
                  />
                )}
                <View className="flex-1">
                  <Text className="text-sm font-medium text-app-text dark:text-text-dark" numberOfLines={2}>
                    {recipe.titleI18n?.[language] || recipe.title}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                    {recipe.portions} {t('recipes.portions').toLowerCase()} · {recipe.prepTimeMinutes + recipe.cookTimeMinutes} {t('recipes.minutes')}
                  </Text>
                </View>
                <Button onPress={() => onPick(recipe.id)}>{t('common.add')}</Button>
              </View>
            ))}
          </View>
        )}
      </View>
    </Modal>
  )
}
