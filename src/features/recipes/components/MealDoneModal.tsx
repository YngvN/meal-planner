import { useMemo, useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { TriangleAlert } from 'lucide-react-native'
import { Button, Checkbox, Modal } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { removePlannedMeal } from '../../mealPlan/mealPlanSlice'
import { bulkUpdatePantry } from '../../pantry/pantrySlice'
import { convertUnit, roundConverted } from '../../shared/units'
import { localizedIngredientName } from '../../shared/localize'
import { useLanguage } from '../../../i18n'
import { Image } from 'expo-image'
import type { Recipe } from '../types'

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

      let defaultWillHave: number | undefined
      let conversionNote: 'exact' | 'converted' | 'manual' = 'manual'

      if (pantryItem?.unit && pantryQty !== undefined) {
        const exactMatch = pantryItem.unit.trim().toLowerCase() === ri.unit.trim().toLowerCase()
        if (exactMatch) {
          defaultWillHave = roundConverted(Math.max(0, pantryQty - deduction))
          conversionNote = 'exact'
        } else {
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

  // "Will have" editable state per ingredient
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
    <Modal
      open
      onClose={onClose}
      title={t('recipes.mealDoneTitle')}
      size="large"
      footer={
        <View className="flex-row gap-2">
          <Button variant="secondary" onPress={onClose}>{t('common.cancel')}</Button>
          <Button onPress={handleConfirm}>{t('recipes.mealDoneConfirm')}</Button>
        </View>
      }
    >
      <View className="gap-4">
        {recipe.imageUrl && (
          <Image source={{ uri: recipe.imageUrl }} style={{ width: '100%', height: 120, borderRadius: 8 }} contentFit="cover" />
        )}

        <Text className="text-base font-semibold text-app-text dark:text-text-dark">
          {recipe.title}
          {scale !== 1 && (
            <Text className="text-text-muted dark:text-text-muted-dark"> × {Math.round(scale * 10) / 10}</Text>
          )}
        </Text>

        {/* Column headers */}
        <View className="flex-row gap-1">
          <Text className="flex-1 text-xs font-semibold text-text-muted dark:text-text-muted-dark">{t('common.name')}</Text>
          <Text className="w-16 text-xs font-semibold text-text-muted dark:text-text-muted-dark text-right">{t('recipes.recipeUses')}</Text>
          <Text className="w-16 text-xs font-semibold text-text-muted dark:text-text-muted-dark text-right">{t('recipes.currentlyHave')}</Text>
          <Text className="w-20 text-xs font-semibold text-text-muted dark:text-text-muted-dark text-right">{t('recipes.willHave')}</Text>
        </View>

        {rows.map((row) => (
          <View key={row.ingredientId} className="flex-row gap-1 items-center">
            <Text className="flex-1 text-sm text-app-text dark:text-text-dark" numberOfLines={2}>{row.name}</Text>
            <Text className="w-16 text-xs text-text-muted dark:text-text-muted-dark text-right">
              {roundConverted(row.recipeQty)} {row.recipeUnit}
            </Text>
            <View className="w-16 flex-row items-center justify-end gap-0.5">
              <Text className="text-xs text-text-muted dark:text-text-muted-dark text-right">
                {row.pantryQty !== undefined
                  ? `${roundConverted(row.pantryQty)} ${row.pantryUnit ?? ''}`
                  : '—'}
              </Text>
              {row.conversionNote === 'manual' && row.pantryQty !== undefined && (
                <TriangleAlert size={12} color="#f59e0b" />
              )}
            </View>
            <View className="w-20 flex-row items-center gap-1">
              <TextInput
                className="flex-1 border border-border dark:border-border-dark rounded px-1.5 py-1 text-xs text-app-text dark:text-text-dark bg-bg dark:bg-bg-dark text-right"
                value={willHaveMap.get(row.ingredientId) ?? ''}
                onChangeText={(v) => setWillHave(row.ingredientId, v)}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor="#6b6375"
              />
              <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                {row.pantryUnit ?? row.recipeUnit}
              </Text>
            </View>
          </View>
        ))}

        {mealId && (
          <Checkbox
            label={t('recipes.removeFromPlan')}
            checked={removeFromPlan}
            onChange={setRemoveFromPlan}
          />
        )}
      </View>
    </Modal>
  )
}
