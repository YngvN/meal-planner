import { useState } from 'react'
import { Alert, Button, Input, Select } from '../../../components'
import { useAppDispatch } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { createIngredient, updateIngredient } from '../ingredientsSlice'
import type { Ingredient, IngredientCategory } from '../types'
import './IngredientForm.scss'

const CATEGORIES: IngredientCategory[] = [
  'produce', 'dairy', 'meat', 'seafood', 'pantry', 'frozen', 'bakery', 'beverages', 'other',
]

interface IngredientFormProps {
  /** Provide to switch to edit mode. */
  ingredient?: Ingredient
  onDone: () => void
}

/**
 * Inline form for creating or editing a global ingredient.
 */
export function IngredientForm({ ingredient, onDone }: IngredientFormProps) {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const isEdit = !!ingredient

  const [name, setName] = useState(ingredient?.name ?? '')
  const [category, setCategory] = useState<IngredientCategory>(ingredient?.category ?? 'other')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError(t('ingredients.form.nameRequired'))
      return
    }
    try {
      if (isEdit) {
        await dispatch(updateIngredient({ id: ingredient.id, payload: { name, category } })).unwrap()
      } else {
        await dispatch(createIngredient({ name, category })).unwrap()
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <form className="ingredient-form" onSubmit={handleSubmit}>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="ingredient-form__fields">
        <Input
          id="ingredient-name"
          label={t('ingredients.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <Select
          id="ingredient-category"
          label={t('ingredients.category')}
          value={category}
          onChange={(e) => setCategory(e.target.value as IngredientCategory)}
          options={CATEGORIES.map((c) => ({ value: c, label: t(`ingredients.categories.${c}`) }))}
        />
      </div>
      <div className="ingredient-form__actions">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  )
}
