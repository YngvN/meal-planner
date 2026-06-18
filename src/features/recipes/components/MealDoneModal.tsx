import { useMemo, useState } from 'react'
import { Button, Modal } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { removePlannedMeal } from '../../mealPlan/mealPlanSlice'
import { bulkUpdatePantry } from '../../pantry/pantrySlice'
import { convertUnit, roundConverted } from '../../shared/units'
import { localizedIngredientName } from '../../shared/localize'
import { useLanguage } from '../../../i18n'
import type { Recipe } from '../types'
import './MealDoneModal.scss'

interface MealDoneModalProps {
  recipe: Recipe
  /** ID of the planned meal to optionally remove after confirming. */
  mealId?: string
  onClose: () => void
}

/**
 * Modal that appears when the user marks a recipe as cooked.
 * Shows a preview of how much of each pantry ingredient will be consumed,
 * lets the user adjust the "will have" quantities, then commits the deductions.
 */
export function MealDoneModal({ recipe, mealId, onClose }: MealDoneModalProps) {
  const dispatch = useAppDispatch()
  const { t, language } = useLanguage()

  const pantryItems = useAppSelector((s) => s.pantry.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)
  const mealPlan = useAppSelector((s) => s.mealPlan.items)

  const [removeFromPlan, setRemoveFromPlan] = useState(true)

  // Portion scale: if this was planned with a custom portions count, scale accordingly
  const scale = useMemo(() => {
    if (!mealId) return 1
    const meal = mealPlan.find((m) => m.id === mealId)
    if (!meal) return 1
    return (meal.portions ?? recipe.portions) / recipe.portions
  }, [mealId, mealPlan, recipe.portions])

  // Build a row for each recipe ingredient
  const rows = useMemo(() => {
    const ingMap = new Map(ingredients.map((i) => [i.id, i]))
    const pantryMap = new Map(pantryItems.map((p) => [p.ingredientId, p]))

    return recipe.ingredients.map((ri) => {
      const ingredient = ingMap.get(ri.ingredientId)
      const pantryItem = pantryMap.get(ri.ingredientId)
      const deduction = ri.quantity * scale
      const pantryQty = pantryItem?.quantity

      // Determine how the deduction was (or wasn't) resolved
      let defaultWillHave: number | undefined
      let conversionNote: 'exact' | 'converted' | 'manual' = 'manual'

      if (pantryItem?.unit && pantryQty !== undefined) {
        const exactMatch = pantryItem.unit.trim().toLowerCase() === ri.unit.trim().toLowerCase()
        if (exactMatch) {
          defaultWillHave = roundConverted(Math.max(0, pantryQty - deduction))
          conversionNote = 'exact'
        } else {
          // Try auto-conversion (same-dimension or cross-dimension via density)
          const converted = convertUnit(deduction, ri.unit, pantryItem.unit, ingredient?.density)
          if (converted !== null) {
            defaultWillHave = roundConverted(Math.max(0, pantryQty - converted))
            conversionNote = 'converted'
          }
        }
      }

      return {
        ingredientId: ri.ingredientId,
        name: ingredient ? localizedIngredientName(ingredient, language) : ri.ingredientId,
        recipeQty: deduction,
        recipeUnit: ri.unit,
        pantryQty,
        pantryUnit: pantryItem?.unit,
        conversionNote,
        defaultWillHave,
      }
    })
  }, [recipe.ingredients, ingredients, pantryItems, scale, language])

  // "Will have" editable state per ingredient — stored as strings to allow empty input
  const [willHaveMap, setWillHaveMap] = useState<Map<string, string>>(
    () => new Map(rows.map((r) => [r.ingredientId, r.defaultWillHave?.toString() ?? ''])),
  )

  function setWillHave(ingredientId: string, value: string) {
    setWillHaveMap((prev) => new Map(prev).set(ingredientId, value))
  }

  async function handleConfirm() {
    const updates: Array<{ ingredientId: string; inStock: boolean; quantity?: number; unit?: string }> = []

    for (const row of rows) {
      const raw = willHaveMap.get(row.ingredientId) ?? ''
      if (raw === '') continue
      const willHave = Number(raw)

      updates.push({
        ingredientId: row.ingredientId,
        quantity: willHave,
        unit: row.pantryUnit ?? row.recipeUnit,
        inStock: willHave > 0,
      })
    }

    if (updates.length > 0) {
      await dispatch(bulkUpdatePantry(updates))
    }

    if (mealId && removeFromPlan) {
      await dispatch(removePlannedMeal(mealId))
    }

    onClose()
  }

  return (
    <Modal open onClose={onClose} title={t('recipes.mealDoneTitle')} size="large">
      <div className="meal-done-modal">
        {recipe.imageUrl && (
          <img src={recipe.imageUrl} alt={recipe.title} className="meal-done-modal__hero" />
        )}

        <p className="meal-done-modal__subtitle">
          {recipe.title}
          {scale !== 1 && (
            <span className="meal-done-modal__scale">
              {' '}× {Math.round(scale * 10) / 10}
            </span>
          )}
        </p>

        <div className="meal-done-modal__table-wrap">
          <table className="meal-done-modal__table">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('recipes.recipeUses')}</th>
                <th>{t('recipes.currentlyHave')}</th>
                <th>{t('recipes.willHave')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ingredientId}>
                  <td className="meal-done-modal__name-cell">{row.name}</td>
                  <td className="meal-done-modal__num-cell">
                    {roundConverted(row.recipeQty)} {row.recipeUnit}
                  </td>
                  <td className="meal-done-modal__num-cell">
                    {row.pantryQty !== undefined
                      ? `${roundConverted(row.pantryQty)} ${row.pantryUnit ?? ''}`
                      : '—'}
                    {row.conversionNote === 'manual' && row.pantryQty !== undefined && (
                      <span className="meal-done-modal__mismatch" title={t('recipes.unitsMismatch')}>
                        {' '}⚠
                      </span>
                    )}
                  </td>
                  <td className="meal-done-modal__will-have-cell">
                    <input
                      type="number"
                      className="meal-done-modal__qty-input"
                      value={willHaveMap.get(row.ingredientId) ?? ''}
                      onChange={(e) => setWillHave(row.ingredientId, e.target.value)}
                      min={0}
                      step={0.1}
                      placeholder="—"
                    />
                    <span className="meal-done-modal__unit">
                      {row.pantryUnit ?? row.recipeUnit}
                    </span>
                    {row.conversionNote === 'converted' && (
                      <span className="meal-done-modal__converted-note">
                        {t('converter.converted')}
                      </span>
                    )}
                    {row.conversionNote === 'manual' && row.pantryUnit && (
                      <span className="meal-done-modal__mismatch-note">
                        {t('recipes.unitsMismatch')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mealId && (
          <label className="meal-done-modal__remove-label">
            <input
              type="checkbox"
              checked={removeFromPlan}
              onChange={(e) => setRemoveFromPlan(e.target.checked)}
              className="meal-done-modal__checkbox"
            />
            {t('recipes.removeFromPlan')}
          </label>
        )}

        <div className="meal-done-modal__footer">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleConfirm}>{t('recipes.mealDoneConfirm')}</Button>
        </div>
      </div>
    </Modal>
  )
}
