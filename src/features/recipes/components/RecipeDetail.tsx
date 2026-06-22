import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { ArrowLeft, ArrowLeftRight, Check, Clock, Pencil, Star, Trash2, X } from 'lucide-react-native'
import { Alert, Badge, Button, Modal, Select, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import type { Ingredient } from '../../ingredients/types'
import type { NutritionalValues } from '../../shared/types'
import { deleteRecipe, fetchRecipeById, toggleFavorite } from '../recipesSlice'
import { fetchIngredients } from '../../ingredients/ingredientsSlice'
import type { Recipe, RecipeIngredient } from '../types'
import { ALL_UNIT_KEYS, convertUnit, getUnitDimension, roundConverted } from '../../shared/units'
import { localizedIngredientName, localizedProductName, localizeRecipe, localizeUnit } from '../../shared/localize'
import { MealDoneModal } from './MealDoneModal'
import { RecipePantryCheck } from '../../pantry/components/RecipePantryCheck'

/**
 * Calculates total nutritional values for a recipe from its ingredient data.
 * Ingredient nutrition is expressed per 100g/100ml; quantity is the weight/volume used.
 * Returns null when no ingredient has nutrition data.
 */
function calculateNutrition(
  recipe: Recipe,
  ingredientMap: Map<string, Ingredient>,
): NutritionalValues | null {
  let hasAny = false
  const totals: NutritionalValues = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

  for (const ri of recipe.ingredients) {
    const ing = ingredientMap.get(ri.ingredientId)
    if (!ing) continue

    const nutrition = ri.productId
      ? (ing.products?.find((sp) => sp.id === ri.productId)?.nutrition ?? ing.nutrition)
      : ing.nutrition

    if (!nutrition) continue
    hasAny = true

    const factor = ri.quantity / 100
    if (nutrition.calories !== undefined) totals.calories! += nutrition.calories * factor
    if (nutrition.protein !== undefined) totals.protein! += nutrition.protein * factor
    if (nutrition.carbs !== undefined) totals.carbs! += nutrition.carbs * factor
    if (nutrition.fat !== undefined) totals.fat! += nutrition.fat * factor
    if (nutrition.fiber !== undefined) totals.fiber! += nutrition.fiber * factor
  }

  if (!hasAny) return null
  return {
    calories: Math.round(totals.calories!),
    protein: Math.round(totals.protein! * 10) / 10,
    carbs: Math.round(totals.carbs! * 10) / 10,
    fat: Math.round(totals.fat! * 10) / 10,
    fiber: Math.round(totals.fiber! * 10) / 10,
  }
}

/** Renders a nutrition block, shared between manual and calculated modes. */
function NutritionBlock({ nutrition, label }: { nutrition: NutritionalValues; label: string }) {
  const { t } = useLanguage()
  return (
    <View className="gap-2">
      <Text className="text-xs text-text-muted dark:text-text-muted-dark">{label}</Text>
      <View className="flex-row flex-wrap gap-3">
        {nutrition.calories !== undefined && (
          <View className="items-center">
            <Text className="text-sm font-semibold text-app-text dark:text-text-dark">{nutrition.calories} kcal</Text>
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('recipes.nutrients.calories')}</Text>
          </View>
        )}
        {nutrition.protein !== undefined && (
          <View className="items-center">
            <Text className="text-sm font-semibold text-app-text dark:text-text-dark">{nutrition.protein}g</Text>
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('recipes.nutrients.protein')}</Text>
          </View>
        )}
        {nutrition.carbs !== undefined && (
          <View className="items-center">
            <Text className="text-sm font-semibold text-app-text dark:text-text-dark">{nutrition.carbs}g</Text>
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('recipes.nutrients.carbs')}</Text>
          </View>
        )}
        {nutrition.fat !== undefined && (
          <View className="items-center">
            <Text className="text-sm font-semibold text-app-text dark:text-text-dark">{nutrition.fat}g</Text>
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('recipes.nutrients.fat')}</Text>
          </View>
        )}
        {nutrition.fiber !== undefined && (
          <View className="items-center">
            <Text className="text-sm font-semibold text-app-text dark:text-text-dark">{nutrition.fiber}g</Text>
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('recipes.nutrients.fiber')}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

interface RecipeDetailProps {
  recipeId: string
}

/**
 * Full recipe detail view.
 * Shows all metadata, ingredients with pantry indicators, instructions,
 * source attribution, and nutrition (manual or calculated from ingredients).
 */
export function RecipeDetail({ recipeId }: RecipeDetailProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { t, language } = useLanguage()
  const params = useLocalSearchParams<{ mealId?: string }>()

  const { selectedRecipe: rawRecipe, status, error } = useAppSelector((s) => s.recipes)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showMealDone, setShowMealDone] = useState(false)
  // ingredientId → target unit key selected in the toggle
  const [convertedUnits, setConvertedUnits] = useState<Map<string, string>>(new Map())

  const mealId = params.mealId ?? undefined

  useEffect(() => {
    dispatch(fetchRecipeById(recipeId))
  }, [dispatch, recipeId])

  const ingredientsLoaded = useAppSelector((s) => s.ingredients.status !== 'idle')
  useEffect(() => {
    if (!ingredientsLoaded) dispatch(fetchIngredients())
  }, [dispatch, ingredientsLoaded])

  if (status === 'loading') return <Spinner />
  if (status === 'failed') return <Alert variant="error">{error ?? t('common.error')}</Alert>
  if (!rawRecipe) return null

  const recipe = localizeRecipe(rawRecipe, language)
  const pantryMap = new Map(pantryItems.map((p) => [p.ingredientId, p]))
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))

  function getIngredientName(ri: RecipeIngredient) {
    const ing = ingredientMap.get(ri.ingredientId)
    if (!ing) return ri.ingredientId
    const baseName = localizedIngredientName(ing, language)
    if (ri.productId) {
      const sp = ing.products?.find((s) => s.id === ri.productId)
      if (sp) return `${baseName} — ${localizedProductName(sp, language)}`
    }
    return baseName
  }

  function isInPantry(ingredientId: string) {
    return pantryMap.get(ingredientId)?.inStock === true
  }

  async function handleDelete() {
    await dispatch(deleteRecipe(recipe!.id))
    router.push('/recipes' as any)
  }

  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes
  const calculatedNutrition = calculateNutrition(recipe, ingredientMap)

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="p-4 gap-4">
        {/* Top action bar */}
        <View className="flex-row items-center justify-between flex-wrap gap-2">
          <Button variant="secondary" onPress={() => router.push('/recipes' as any)}>
            <ArrowLeft size={16} color="#6b7280" />
            <Text className="text-app-text dark:text-text-dark">{t('common.back')}</Text>
          </Button>
          <View className="flex-row flex-wrap gap-2">
            <Button onPress={() => setShowMealDone(true)}>
              <Check size={16} color="#ffffff" />
              <Text className="text-accent-contrast dark:text-accent-contrast-dark">{t('recipes.mealDone')}</Text>
            </Button>
            <Button
              variant="secondary"
              onPress={() => dispatch(toggleFavorite(recipe.id))}
            >
              <Star size={16} fill={recipe.isFavorite ? '#f59e0b' : 'none'} color={recipe.isFavorite ? '#f59e0b' : '#6b7280'} />
            </Button>
            <Button variant="secondary" onPress={() => router.push(`/recipes/${recipe.id}/edit` as any)}>
              <Pencil size={15} color="#6b7280" />
            </Button>
            <Button variant="secondary" onPress={() => setConfirmDelete(true)}>
              <Trash2 size={15} color="#6b7280" />
            </Button>
          </View>
        </View>

        {/* Hero image */}
        {recipe.imageUrl && (
          <Image
            source={{ uri: recipe.imageUrl }}
            style={{ width: '100%', height: 220, borderRadius: 12 }}
            contentFit="cover"
          />
        )}

        {/* Title + description */}
        <View className="gap-1">
          <Text className="text-2xl font-bold text-app-text dark:text-text-dark">{recipe.title}</Text>
          {recipe.description && (
            <Text className="text-base text-text-muted dark:text-text-muted-dark">{recipe.description}</Text>
          )}
          {recipe.source && (
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                {t('recipes.source.source')}: {recipe.source.name}
              </Text>
              <Badge variant="neutral">{t(`recipes.sourceType.${recipe.source.type}`)}</Badge>
            </View>
          )}
        </View>

        {/* Meta grid */}
        <View className="flex-row flex-wrap gap-3 bg-surface dark:bg-surface-dark rounded-xl p-3">
          {[
            { label: t('recipes.prepTime'), value: `${recipe.prepTimeMinutes} ${t('recipes.minutes')}` },
            { label: t('recipes.cookTime'), value: `${recipe.cookTimeMinutes} ${t('recipes.minutes')}` },
            { label: t('recipes.totalTime'), value: `${totalMinutes} ${t('recipes.minutes')}` },
            { label: t('recipes.portions'), value: String(recipe.portions) },
            { label: t('recipes.skillLevel'), value: t(`recipes.skill.${recipe.skillLevel}`) },
          ].map(({ label, value }) => (
            <View key={label} className="items-center min-w-16">
              <Text className="text-xs text-text-muted dark:text-text-muted-dark">{label}</Text>
              <Text className="text-sm font-semibold text-app-text dark:text-text-dark">{value}</Text>
            </View>
          ))}
        </View>

        {/* Tags */}
        <View className="flex-row flex-wrap gap-1">
          {recipe.dietaryTags.map((tag) => (
            <Badge key={tag} variant="success">{tag}</Badge>
          ))}
          {recipe.mealTags.map((tag) => (
            <Badge key={tag} variant="info">{t(`recipes.mealTag.${tag}`)}</Badge>
          ))}
          {recipe.cuisineTypes.map((c) => (
            <Badge key={c} variant="neutral">{c}</Badge>
          ))}
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="neutral">{tag}</Badge>
          ))}
        </View>

        {/* Pantry check */}
        <RecipePantryCheck ingredients={recipe.ingredients} />

        {/* Ingredients */}
        <View className="gap-2">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.ingredients')}</Text>
          {recipe.ingredients.map((ri) => {
            const inPantry = isInPantry(ri.ingredientId)
            const ing = ingredientMap.get(ri.ingredientId)
            const targetUnit = convertedUnits.get(ri.ingredientId)
            const convertedQty = targetUnit
              ? convertUnit(ri.quantity, ri.unit, targetUnit, ing?.density)
              : null

            const fromDim = getUnitDimension(ri.unit)
            const compatibleUnits = fromDim
              ? ALL_UNIT_KEYS.filter((u) => {
                  if (u === ri.unit) return false
                  const toDim = getUnitDimension(u)
                  if (!toDim || toDim === 'count') return false
                  if (toDim === fromDim) return true
                  return ing?.density !== undefined
                })
              : []

            return (
              <View
                key={`${ri.ingredientId}-${ri.productId ?? ''}`}
                className={`flex-row items-center gap-2 p-2 rounded-lg ${!inPantry ? 'bg-warning-bg dark:bg-warning-bg-dark' : 'bg-surface dark:bg-surface-dark'}`}
              >
                {inPantry
                  ? <Check size={16} color="#22c55e" />
                  : <X size={16} color="#ef4444" />
                }
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-medium text-app-text dark:text-text-dark">
                    {ri.quantity} {localizeUnit(ri.unit, t)}
                    {convertedQty !== null && targetUnit && (
                      <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                        {' '}≈ {roundConverted(convertedQty)} {localizeUnit(targetUnit, t)}
                      </Text>
                    )}
                  </Text>
                  <Text className="text-sm text-app-text dark:text-text-dark">{getIngredientName(ri)}</Text>
                </View>
                {!inPantry && <Badge variant="warning">{t('recipes.missingFromPantry')}</Badge>}
                {compatibleUnits.length > 0 && (
                  <Select
                    value={targetUnit ?? ''}
                    onChange={(v) => {
                      const next = new Map(convertedUnits)
                      if (v) next.set(ri.ingredientId, v)
                      else next.delete(ri.ingredientId)
                      setConvertedUnits(next)
                    }}
                    options={[
                      { value: '', label: localizeUnit(ri.unit, t) },
                      ...compatibleUnits.map((u) => ({ value: u, label: localizeUnit(u, t) })),
                    ]}
                  />
                )}
              </View>
            )
          })}
        </View>

        {/* Instructions */}
        <View className="gap-2">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.instructions')}</Text>
          {recipe.instructions
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <View key={step.order} className="flex-row gap-3 bg-surface dark:bg-surface-dark rounded-lg p-3">
                <View className="w-6 h-6 rounded-full bg-accent dark:bg-accent-dark items-center justify-center flex-shrink-0 mt-0.5">
                  <Text className="text-xs font-bold text-accent-contrast">{step.order}</Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm text-app-text dark:text-text-dark">{step.description}</Text>
                  {step.timerMinutes != null && (
                    <View className="flex-row items-center gap-1">
                      <Clock size={12} color="#6b7280" />
                      <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                        {step.timerMinutes} {t('recipes.minutes')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
        </View>

        {/* Notes */}
        {recipe.notes && (
          <View className="gap-2">
            <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.notes')}</Text>
            <Text className="text-sm text-app-text dark:text-text-dark bg-surface dark:bg-surface-dark rounded-lg p-3">
              {recipe.notes}
            </Text>
          </View>
        )}

        {/* Nutrition */}
        {(recipe.nutrition || calculatedNutrition) && (
          <View className="gap-2 bg-surface dark:bg-surface-dark rounded-xl p-3">
            <Text className="text-lg font-semibold text-app-text dark:text-text-dark">
              {t('recipes.nutrition.nutrition')}
            </Text>
            {recipe.nutrition ? (
              <NutritionBlock nutrition={recipe.nutrition} label={t('recipes.nutrition.manual')} />
            ) : calculatedNutrition ? (
              <NutritionBlock nutrition={calculatedNutrition} label={t('recipes.nutrition.calculated')} />
            ) : null}
          </View>
        )}

      </View>

      {/* Meal done modal */}
      {showMealDone && (
        <MealDoneModal
          recipe={recipe}
          mealId={mealId}
          onClose={() => setShowMealDone(false)}
        />
      )}

      {/* Delete confirmation */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('common.confirmDeleteTitle')}
        footer={
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button onPress={handleDelete}>{t('common.delete')}</Button>
          </View>
        }
      >
        <Text className="text-base text-app-text dark:text-text-dark">{t('common.confirmDelete')}</Text>
      </Modal>
    </ScrollView>
  )
}
