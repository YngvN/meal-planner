import { View, Text } from 'react-native'
import { Star } from 'lucide-react-native'
import { FilterChip, Select } from '../../../components'
import { useLanguage } from '../../../i18n'
import type { DietaryTag, MealTag, RecipeFilters as Filters, SkillLevel } from '../types'

const DIETARY_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free']
const MEAL_TAGS: MealTag[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']
const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced']

interface RecipeFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

/**
 * Filter panel for the recipe list.
 * Controls dietary tags, meal tags, skill level, and favorites-only toggle.
 */
export function RecipeFilters({ filters, onChange }: RecipeFiltersProps) {
  const { t } = useLanguage()

  function toggleDietary(tag: DietaryTag) {
    const current = filters.dietaryTags ?? []
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    onChange({ ...filters, dietaryTags: next })
  }

  function toggleMeal(tag: MealTag) {
    const current = filters.mealTags ?? []
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    onChange({ ...filters, mealTags: next })
  }

  function setSkillLevel(value: string) {
    onChange({ ...filters, skillLevel: value ? (value as SkillLevel) : undefined })
  }

  function toggleFavorites() {
    onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })
  }

  return (
    <View className="gap-3 p-3 bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark">
      <View className="gap-2">
        <Text className="text-sm font-semibold text-app-text dark:text-text-dark">
          {t('recipes.filters.dietary')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {DIETARY_TAGS.map((tag) => (
            <FilterChip
              key={tag}
              active={filters.dietaryTags?.includes(tag)}
              onPress={() => toggleDietary(tag)}
            >
              {tag}
            </FilterChip>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-app-text dark:text-text-dark">
          {t('recipes.filters.mealType')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {MEAL_TAGS.map((tag) => (
            <FilterChip
              key={tag}
              active={filters.mealTags?.includes(tag)}
              onPress={() => toggleMeal(tag)}
            >
              {t(`recipes.mealTag.${tag}`)}
            </FilterChip>
          ))}
        </View>
      </View>

      <Select
        label={t('recipes.filters.skill')}
        value={filters.skillLevel ?? ''}
        onChange={setSkillLevel}
        options={SKILL_LEVELS.map((s) => ({ value: s, label: t(`recipes.skill.${s}`) }))}
        placeholder={t('recipes.filters.anySkill')}
      />

      <FilterChip active={filters.favoritesOnly} onPress={toggleFavorites}>
        {t('recipes.filters.favoritesOnly')}
      </FilterChip>
    </View>
  )
}
