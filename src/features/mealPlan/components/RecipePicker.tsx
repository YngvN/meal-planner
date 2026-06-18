import { useState } from 'react'
import { Button, Modal, SearchBar } from '../../../components'
import { useAppSelector } from '../../../app/hooks'
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
  const { t } = useLanguage()
  const recipes = useAppSelector((s) => s.recipes.items)
  const [search, setSearch] = useState('')

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()),
  )

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
      <div className="recipe-picker">
        <SearchBar value={search} onChange={setSearch} placeholder={t('recipes.search')} />

        <ul className="recipe-picker__list">
          {filtered.map((recipe) => (
            <li key={recipe.id} className="recipe-picker__item">
              {recipe.imageUrl && (
                <img
                  src={recipe.imageUrl}
                  alt=""
                  className="recipe-picker__thumb"
                  loading="lazy"
                />
              )}
              <div className="recipe-picker__info">
                <span className="recipe-picker__title">{recipe.title}</span>
                <span className="recipe-picker__meta">
                  {recipe.portions} {t('recipes.portions').toLowerCase()} · {recipe.prepTimeMinutes + recipe.cookTimeMinutes} {t('recipes.minutes')}
                </span>
              </div>
              <Button onClick={() => onPick(recipe.id)}>{t('common.add')}</Button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="recipe-picker__empty">{t('recipes.noResults')}</li>
          )}
        </ul>
      </div>
    </Modal>
  )
}
