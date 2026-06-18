import { FilterChip, Select } from '../../../components'
import { useLanguage } from '../../../i18n'
import type { DietaryTag, MealTag, RecipeFilters as Filters, SkillLevel } from '../types'
import './RecipeFilters.scss'

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
    <aside className="recipe-filters">
      <div className="recipe-filters__group">
        <h4 className="recipe-filters__label">{t('recipes.filters.dietary')}</h4>
        <div className="recipe-filters__chips">
          {DIETARY_TAGS.map((tag) => (
            <FilterChip
              key={tag}
              active={filters.dietaryTags?.includes(tag)}
              onClick={() => toggleDietary(tag)}
            >
              {tag}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="recipe-filters__group">
        <h4 className="recipe-filters__label">{t('recipes.filters.mealType')}</h4>
        <div className="recipe-filters__chips">
          {MEAL_TAGS.map((tag) => (
            <FilterChip
              key={tag}
              active={filters.mealTags?.includes(tag)}
              onClick={() => toggleMeal(tag)}
            >
              {t(`recipes.mealTag.${tag}`)}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="recipe-filters__group">
        <Select
          label={t('recipes.filters.skill')}
          value={filters.skillLevel ?? ''}
          onChange={(e) => setSkillLevel(e.target.value)}
          options={SKILL_LEVELS.map((s) => ({ value: s, label: t(`recipes.skill.${s}`) }))}
          placeholder={t('recipes.filters.anySkill')}
        />
      </div>

      <div className="recipe-filters__group">
        <FilterChip active={filters.favoritesOnly} onClick={toggleFavorites}>
          ★ {t('recipes.filters.favoritesOnly')}
        </FilterChip>
      </div>
    </aside>
  )
}
