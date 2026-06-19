import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Alert, Button, Input, NumberInput, Select } from '../../../components'
import { useAppDispatch } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { createIngredient, updateIngredient } from '../ingredientsSlice'
import { NutritionScanButton } from '../../ai/components/NutritionScanButton'
import type { Ingredient, IngredientCategory, SubProduct } from '../types'
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
 * Form for creating or editing a global ingredient.
 * Includes nutrition per 100g, default shelf life, and named subproduct variants.
 */
export function IngredientForm({ ingredient, onDone }: IngredientFormProps) {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const isEdit = !!ingredient

  const [name, setName] = useState(ingredient?.name ?? '')
  const [category, setCategory] = useState<IngredientCategory>(ingredient?.category ?? 'other')
  const [defaultExpiryDays, setDefaultExpiryDays] = useState(ingredient?.defaultExpiryDays ?? 0)
  const [imageUrl, setImageUrl] = useState(ingredient?.imageUrl ?? '')
  const [density, setDensity] = useState<string>(String(ingredient?.density ?? ''))
  const [isPrivate, setIsPrivate] = useState(ingredient?.isGlobal === false)

  // Nutrition per 100g
  const [calories, setCalories] = useState<string>(String(ingredient?.nutrition?.calories ?? ''))
  const [protein, setProtein] = useState<string>(String(ingredient?.nutrition?.protein ?? ''))
  const [carbs, setCarbs] = useState<string>(String(ingredient?.nutrition?.carbs ?? ''))
  const [fat, setFat] = useState<string>(String(ingredient?.nutrition?.fat ?? ''))
  const [fiber, setFiber] = useState<string>(String(ingredient?.nutrition?.fiber ?? ''))

  // Subproducts
  const [subproducts, setSubproducts] = useState<SubProduct[]>(
    ingredient?.subproducts?.map((sp) => ({ ...sp })) ?? [],
  )

  const [error, setError] = useState<string | null>(null)

  function parseOptionalNumber(val: string): number | undefined {
    const n = parseFloat(val)
    return isNaN(n) ? undefined : n
  }

  function addSubproduct() {
    setSubproducts([
      ...subproducts,
      { id: `sp-${Date.now()}`, name: '' },
    ])
  }

  function updateSubproduct(idx: number, patch: Partial<SubProduct>) {
    setSubproducts(subproducts.map((sp, i) => (i === idx ? { ...sp, ...patch } : sp)))
  }

  function updateSubproductNutrition(idx: number, field: string, value: string) {
    const n = parseFloat(value)
    const current = subproducts[idx]
    setSubproducts(subproducts.map((sp, i) =>
      i === idx
        ? { ...sp, nutrition: { ...current.nutrition, [field]: isNaN(n) ? undefined : n } }
        : sp,
    ))
  }

  function removeSubproduct(idx: number) {
    setSubproducts(subproducts.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t('ingredients.form.nameRequired'))
      return
    }

    const nutritionPayload = {
      calories: parseOptionalNumber(calories),
      protein: parseOptionalNumber(protein),
      carbs: parseOptionalNumber(carbs),
      fat: parseOptionalNumber(fat),
      fiber: parseOptionalNumber(fiber),
    }
    const hasNutrition = Object.values(nutritionPayload).some((v) => v !== undefined)

    const payload = {
      name: name.trim(),
      category,
      defaultExpiryDays: defaultExpiryDays > 0 ? defaultExpiryDays : undefined,
      nutrition: hasNutrition ? nutritionPayload : undefined,
      subproducts: subproducts.filter((sp) => sp.name.trim()),
      imageUrl: imageUrl.trim() || undefined,
      density: parseOptionalNumber(density),
      isGlobal: !isPrivate,
    }

    try {
      if (isEdit) {
        await dispatch(updateIngredient({ id: ingredient.id, payload })).unwrap()
      } else {
        await dispatch(createIngredient(payload)).unwrap()
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <form className="ingredient-form" onSubmit={handleSubmit}>
      {error && <Alert variant="error">{error}</Alert>}

      <div className="ingredient-form__section">
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
        <div className="ingredient-form__image-row">
          <div className="input-field">
            <label htmlFor="ingredient-image">{t('ingredients.imageUrl')}</label>
            <input
              id="ingredient-image"
              type="url"
              className="input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {imageUrl.trim() && (
            <img
              src={imageUrl}
              alt={t('common.imagePreview')}
              className="ingredient-form__image-preview"
            />
          )}
        </div>
        <div className="ingredient-form__expiry">
          <NumberInput
            id="ingredient-expiry"
            label={t('ingredients.defaultExpiryDays')}
            value={defaultExpiryDays}
            onChange={setDefaultExpiryDays}
            min={0}
            step={1}
          />
          <span className="ingredient-form__expiry-hint">
            {defaultExpiryDays === 0 ? t('ingredients.noDefaultExpiry') : `${defaultExpiryDays} days`}
          </span>
        </div>
      </div>

      <div className="ingredient-form__section">
        <div className="ingredient-form__section-header">
          <h4 className="ingredient-form__section-title">{t('ingredients.nutrition')}</h4>
          <NutritionScanButton
            onResult={(n) => {
              if (n.calories !== undefined) setCalories(String(n.calories))
              if (n.protein !== undefined) setProtein(String(n.protein))
              if (n.carbs !== undefined) setCarbs(String(n.carbs))
              if (n.fat !== undefined) setFat(String(n.fat))
              if (n.fiber !== undefined) setFiber(String(n.fiber))
            }}
            onError={(msg) => setError(msg)}
          />
        </div>
        <div className="ingredient-form__nutrition-grid">
          <Input
            id="ing-calories"
            label={t('recipes.nutrients.calories')}
            type="number"
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="kcal"
          />
          <Input
            id="ing-protein"
            label={`${t('recipes.nutrients.protein')} (g)`}
            type="number"
            min="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
          <Input
            id="ing-carbs"
            label={`${t('recipes.nutrients.carbs')} (g)`}
            type="number"
            min="0"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
          <Input
            id="ing-fat"
            label={`${t('recipes.nutrients.fat')} (g)`}
            type="number"
            min="0"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
          <Input
            id="ing-fiber"
            label={`${t('recipes.nutrients.fiber')} (g)`}
            type="number"
            min="0"
            value={fiber}
            onChange={(e) => setFiber(e.target.value)}
          />
        </div>

        <div className="ingredient-form__density-row">
          <Input
            id="ing-density"
            label={t('ingredients.density')}
            type="number"
            min="0"
            step="0.01"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            placeholder="e.g. 1.0"
          />
          <span className="ingredient-form__density-hint">{t('ingredients.densityHint')}</span>
        </div>
      </div>

      <div className="ingredient-form__section">
        <div className="ingredient-form__section-header">
          <h4 className="ingredient-form__section-title">{t('ingredients.subproducts')}</h4>
          <Button type="button" variant="secondary" onClick={addSubproduct}>
            <Plus size={16} aria-hidden /> {t('ingredients.addSubproduct')}
          </Button>
        </div>

        {subproducts.map((sp, idx) => (
          <div key={sp.id} className="ingredient-form__subproduct">
            <div className="ingredient-form__subproduct-header">
              <Input
                id={`sp-name-${idx}`}
                label={t('ingredients.subproductName')}
                value={sp.name}
                onChange={(e) => updateSubproduct(idx, { name: e.target.value })}
                placeholder={t('ingredients.subproductName')}
              />
              <Button type="button" variant="secondary" onClick={() => removeSubproduct(idx)} aria-label={t('common.delete')}>
                <X size={16} aria-hidden />
              </Button>
            </div>
            <details className="ingredient-form__subproduct-nutrition">
              <summary>{t('ingredients.nutrition')} + {t('ingredients.imageUrl')} ({t('common.optional')})</summary>
              <div className="ingredient-form__subproduct-image-row">
                <div className="input-field">
                  <label htmlFor={`sp-${idx}-image`}>{t('ingredients.imageUrl')}</label>
                  <input
                    id={`sp-${idx}-image`}
                    type="url"
                    className="input"
                    value={sp.imageUrl ?? ''}
                    onChange={(e) => updateSubproduct(idx, { imageUrl: e.target.value || undefined })}
                    placeholder="https://…"
                  />
                </div>
                {sp.imageUrl && (
                  <img
                    src={sp.imageUrl}
                    alt=""
                    className="ingredient-form__image-preview"
                  />
                )}
              </div>
              <div className="ingredient-form__nutrition-grid ingredient-form__nutrition-grid--compact">
                {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field) => (
                  <Input
                    key={field}
                    id={`sp-${idx}-${field}`}
                    label={field === 'calories' ? t(`recipes.nutrients.${field}`) : `${t(`recipes.nutrients.${field}`)} (g)`}
                    type="number"
                    min="0"
                    value={sp.nutrition?.[field] !== undefined ? String(sp.nutrition[field]) : ''}
                    onChange={(e) => updateSubproductNutrition(idx, field, e.target.value)}
                    placeholder={t('common.inheritsParent')}
                  />
                ))}
              </div>
            </details>
          </div>
        ))}
      </div>

      <label className="ingredient-form__private-label">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
        {t('common.makePrivate')}
      </label>

      <div className="ingredient-form__actions">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  )
}
