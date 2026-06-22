import { useEffect, useMemo } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { ArrowRight } from 'lucide-react-native'
import { Badge, Button } from '../components'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import type { Ingredient } from '../features/ingredients/types'
import { fetchIngredients } from '../features/ingredients/ingredientsSlice'
import { fetchMealPlan } from '../features/mealPlan/mealPlanSlice'
import { MEAL_SLOT_ORDER } from '../features/mealPlan/types'
import { RecipeMatcher } from '../features/pantry/components/RecipeMatcher'
import { fetchPantry } from '../features/pantry/pantrySlice'
import { fetchRecipes } from '../features/recipes/recipesSlice'
import { TranslationTodo } from '../features/ai/components/TranslationTodo'
import { localizedIngredientName } from '../features/shared/localize'
import { useLanguage } from '../i18n'

/** Number of days ahead to consider an item "expiring soon" on the dashboard. */
const EXPIRY_WINDOW_DAYS = 7

/** Snapshot taken at page load; avoids Date.now() during re-renders. */
const PAGE_LOAD_TIME = Date.now()

/** Today's date string in "YYYY-MM-DD" format, set at module load time. */
const TODAY_STRING = new Date(PAGE_LOAD_TIME).toISOString().slice(0, 10)

/** Categories where a missing defaultExpiryDays is worth flagging. */
const PERISHABLE_CATEGORIES = new Set(['produce', 'dairy', 'meat', 'seafood'])

/** Returns the list of what's missing for an ingredient, as translation key suffixes. */
function getMissingFields(ing: Ingredient): string[] {
  const missing: string[] = []
  if (!ing.nutrition) missing.push('missingNutrition')
  if (!ing.defaultExpiryDays && PERISHABLE_CATEGORIES.has(ing.category)) missing.push('missingExpiry')
  if (!ing.imageUrl) missing.push('missingImage')
  return missing
}

/**
 * Home dashboard — Next meal, What can I make, Expiring soon, Things to do.
 */
export function Home() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { t, language } = useLanguage()

  const recipes = useAppSelector((s) => s.recipes.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const plannedMeals = useAppSelector((s) => s.mealPlan.items)

  useEffect(() => {
    if (recipes.length === 0) dispatch(fetchRecipes())
    if (ingredients.length === 0) dispatch(fetchIngredients())
    if (pantryItems.length === 0) dispatch(fetchPantry())
    if (plannedMeals.length === 0) dispatch(fetchMealPlan())
  }, [dispatch, recipes.length, ingredients.length, pantryItems.length, plannedMeals.length])

  const ingredientMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  /** The next upcoming planned meal (on or after today), sorted by date then slot order. */
  const nextMeal = useMemo(() => {
    const upcoming = plannedMeals
      .filter((m) => m.date >= TODAY_STRING)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return MEAL_SLOT_ORDER.indexOf(a.slot) - MEAL_SLOT_ORDER.indexOf(b.slot)
      })
    return upcoming[0] ?? null
  }, [plannedMeals])

  const nextMealRecipe = nextMeal ? recipeMap.get(nextMeal.recipeId) : null

  const expiringSoon = useMemo(() => {
    const windowMs = EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    return pantryItems
      .filter((p) => {
        if (!p.inStock || !p.expiresAt) return false
        const diff = new Date(p.expiresAt).getTime() - PAGE_LOAD_TIME
        return diff > 0 && diff <= windowMs
      })
      .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime())
  }, [pantryItems])

  const incompleteIngredients = useMemo(() => {
    return ingredients
      .map((ing) => ({ ing, missing: getMissingFields(ing) }))
      .filter(({ missing }) => missing.length > 0)
      .slice(0, 10) // cap at 10 to keep the widget scannable
  }, [ingredients])

  function daysUntilExpiry(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - PAGE_LOAD_TIME
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  /** Human-readable date label relative to today. */
  function dateLabel(dateStr: string): string {
    if (dateStr === TODAY_STRING) return t('home.today')
    const tomorrow = new Date(PAGE_LOAD_TIME)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === tomorrow.toISOString().slice(0, 10)) return t('home.tomorrow')
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  }

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="p-4 gap-6">

        {/* ── Next meal ─────────────────────────────────────────────────────── */}
        <View className="gap-2">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('home.nextMeal')}</Text>
          {nextMeal && nextMealRecipe ? (
            <Pressable
              className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark overflow-hidden active:opacity-80"
              onPress={() => router.push(`/recipes/${nextMealRecipe.id}?mealId=${nextMeal.id}` as any)}
            >
              {nextMealRecipe.imageUrl && (
                <Image source={{ uri: nextMealRecipe.imageUrl }} style={{ width: '100%', height: 140 }} contentFit="cover" />
              )}
              <View className="p-3 gap-1">
                <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                  {dateLabel(nextMeal.date)} · {t(`mealPlan.slot.${nextMeal.slot}`)}
                </Text>
                <Text className="text-base font-semibold text-app-text dark:text-text-dark">
                  {nextMealRecipe.titleI18n?.[language] || nextMealRecipe.title}
                </Text>
                <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                  {nextMealRecipe.portions} {t('recipes.portions').toLowerCase()} · {nextMealRecipe.prepTimeMinutes + nextMealRecipe.cookTimeMinutes} {t('recipes.minutes')}
                </Text>
                <Button variant="secondary" onPress={(e) => { router.push('/meal-plan' as any) }}>
                  {t('home.planMeals')}
                </Button>
              </View>
            </Pressable>
          ) : (
            <View className="gap-3">
              <Text className="text-text-muted dark:text-text-muted-dark">{t('home.noMealsPlanned')}</Text>
              <Button onPress={() => router.push('/meal-plan' as any)}>{t('home.planMeals')}</Button>
            </View>
          )}
        </View>

        {/* ── What can I make ───────────────────────────────────────────────── */}
        <View className="gap-2">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('home.whatCanIMake')}</Text>
          <RecipeMatcher limit={5} />
        </View>

        {/* ── Expiring soon ─────────────────────────────────────────────────── */}
        <View className="gap-2">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('home.expiringSoon')}</Text>
          {expiringSoon.length === 0 ? (
            <Badge variant="success">{t('home.allFresh')}</Badge>
          ) : (
            <View className="gap-2">
              {expiringSoon.map((item) => {
                const ing = ingredientMap.get(item.ingredientId)
                if (!ing) return null
                const days = daysUntilExpiry(item.expiresAt!)
                const isUrgent = days <= 2

                return (
                  <View key={item.ingredientId} className="flex-row items-center justify-between bg-surface dark:bg-surface-dark rounded-lg p-3 gap-2">
                    <Text className="flex-1 text-app-text dark:text-text-dark">{localizedIngredientName(ing, language)}</Text>
                    <Badge variant={isUrgent ? 'error' : 'warning'}>
                      {t('home.daysLeft', { count: String(days) })}
                    </Badge>
                    <Pressable onPress={() => router.push('/pantry' as any)} className="flex-row items-center gap-1 active:opacity-70">
                      <Text className="text-sm text-accent dark:text-accent-dark">{t('pantry.title')}</Text>
                      <ArrowRight size={14} color="#7c3aed" />
                    </Pressable>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* ── Things to do ──────────────────────────────────────────────────── */}
        <View className="gap-2">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('home.thingsToDo')}</Text>
          {incompleteIngredients.length === 0 ? (
            <Badge variant="success">{t('home.allComplete')}</Badge>
          ) : (
            <View className="gap-2">
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                {t('home.ingredientsNeedAttention', { count: String(ingredients.filter((i) => getMissingFields(i).length > 0).length) })}
              </Text>
              {incompleteIngredients.map(({ ing, missing }) => (
                <View key={ing.id} className="flex-row items-center gap-2 bg-surface dark:bg-surface-dark rounded-lg p-3">
                  {ing.imageUrl && (
                    <Image source={{ uri: ing.imageUrl }} style={{ width: 36, height: 36, borderRadius: 6 }} contentFit="cover" />
                  )}
                  <View className="flex-1 gap-0.5">
                    <Text className="text-sm font-medium text-app-text dark:text-text-dark">{localizedIngredientName(ing, language)}</Text>
                    <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                      {t('home.missingData', { items: missing.map((k) => t(`ingredients.${k}`)).join(', ') })}
                    </Text>
                  </View>
                  <Pressable onPress={() => router.push(`/ingredients?edit=${ing.id}` as any)} className="flex-row items-center gap-1 active:opacity-70">
                    <Text className="text-sm text-accent dark:text-accent-dark">{t('common.edit')}</Text>
                    <ArrowRight size={14} color="#7c3aed" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Needs translation ─────────────────────────────────────────────── */}
        <TranslationTodo />

      </View>
    </ScrollView>
  )
}
