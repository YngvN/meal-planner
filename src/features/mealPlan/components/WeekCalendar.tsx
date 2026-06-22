import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, X } from 'lucide-react-native'
import { Button } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { suggestForSlot } from '../utils/scoring'
import { addPlannedMeal, removePlannedMeal } from '../mealPlanSlice'
import { MEAL_SLOT_ORDER, type MealSlot, type PlannedMeal } from '../types'
import { RecipePicker } from './RecipePicker'

/** Returns the Monday of the week containing the given date. */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Formats a Date as "YYYY-MM-DD". */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Returns an array of 7 Date objects starting from the given Monday. */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/** ISO date string for today, computed once at module load. */
const TODAY_STRING = toDateString(new Date())

const SUGGESTION_HORIZON_DAYS = 7
const EXPIRY_WINDOW_DAYS = 5

/**
 * Weekly meal planning calendar. Shows Mon–Sun with the user's chosen meal slots per day.
 * Empty future slots show an auto-suggested recipe (when enabled in settings) with an accept
 * button or an override button to pick a different recipe.
 */
export function WeekCalendar() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { t, language } = useLanguage()

  const allPlannedMeals = useAppSelector((s) => s.mealPlan.items)
  const recipes = useAppSelector((s) => s.recipes.items)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const { visibleSlots, autoSuggestEnabled, scoringFactors } = useAppSelector(
    (s) => s.settings.mealPlanner,
  )

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [picking, setPicking] = useState<{ date: string; slot: MealSlot } | null>(null)

  const weekDays = getWeekDays(weekStart)
  const weekEnd = weekDays[6]

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  function prevWeek() {
    setWeekStart((s) => {
      const d = new Date(s); d.setDate(d.getDate() - 7); return d
    })
  }

  function nextWeek() {
    setWeekStart((s) => {
      const d = new Date(s); d.setDate(d.getDate() + 7); return d
    })
  }

  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  function getMeal(dateStr: string, slot: MealSlot): PlannedMeal | undefined {
    return allPlannedMeals.find((m) => m.date === dateStr && m.slot === slot)
  }

  const suggestions = useMemo(() => {
    if (!autoSuggestEnabled || recipes.length === 0) return new Map<string, (typeof recipes)[0]>()

    const horizonEnd = new Date(TODAY_STRING + 'T00:00:00')
    horizonEnd.setDate(horizonEnd.getDate() + SUGGESTION_HORIZON_DAYS)
    const horizonEndStr = toDateString(horizonEnd)

    const pantryInStockIds = new Set(pantryItems.filter((p) => p.inStock).map((p) => p.ingredientId))
    const expiryThreshold = new Date(TODAY_STRING + 'T00:00:00')
    expiryThreshold.setDate(expiryThreshold.getDate() + EXPIRY_WINDOW_DAYS)
    const expiringIds = new Set(
      pantryItems
        .filter((p) => p.expiresAt && new Date(p.expiresAt) <= expiryThreshold)
        .map((p) => p.ingredientId),
    )

    const usageCounts = new Map<string, number>()
    const lastUsedDates = new Map<string, string>()
    for (const meal of allPlannedMeals) {
      usageCounts.set(meal.recipeId, (usageCounts.get(meal.recipeId) ?? 0) + 1)
      const prev = lastUsedDates.get(meal.recipeId)
      if (!prev || meal.date > prev) lastUsedDates.set(meal.recipeId, meal.date)
    }

    const result = new Map<string, (typeof recipes)[0]>()

    for (const day of weekDays) {
      const dateStr = toDateString(day)
      if (dateStr < TODAY_STRING || dateStr > horizonEndStr) continue

      const weekStart7 = toDateString(getWeekStart(day))
      const weekEnd7 = toDateString(weekDays[6])
      const weekMeals = allPlannedMeals.filter((m) => m.date >= weekStart7 && m.date <= weekEnd7)
      const weekRecipeIds = weekMeals.map((m) => m.recipeId)
      const weekIngredientIds = new Set<string>()
      for (const meal of weekMeals) {
        const r = recipeMap.get(meal.recipeId)
        if (r) for (const ing of r.ingredients) weekIngredientIds.add(ing.ingredientId)
      }

      for (const slot of visibleSlots) {
        if (allPlannedMeals.some((m) => m.date === dateStr && m.slot === slot)) continue
        const suggestion = suggestForSlot(slot, recipes, {
          factors: scoringFactors,
          pantryInStockIds,
          expiringIds,
          weekIngredientIds,
          weekRecipeIds,
          usageCounts,
          lastUsedDates,
        })
        if (suggestion) result.set(`${dateStr}::${slot}`, suggestion)
      }
    }

    return result
  }, [autoSuggestEnabled, recipes, pantryItems, allPlannedMeals, visibleSlots, scoringFactors, weekDays, recipeMap])

  async function handleAccept(dateStr: string, slot: MealSlot, recipeId: string) {
    await dispatch(addPlannedMeal({ date: dateStr, slot, recipeId }))
  }

  async function handlePick(recipeId: string) {
    if (!picking) return
    await dispatch(addPlannedMeal({ date: picking.date, slot: picking.slot, recipeId }))
    setPicking(null)
  }

  function handleRemove(meal: PlannedMeal) {
    dispatch(removePlannedMeal(meal.id))
  }

  const orderedVisibleSlots = MEAL_SLOT_ORDER.filter((s) => visibleSlots.includes(s))

  return (
    <View className="flex-1">
      {/* Week navigation */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Button variant="secondary" onPress={prevWeek}>
          <ChevronLeft size={18} color="#6b7280" />
        </Button>
        <Text className="text-sm font-semibold text-app-text dark:text-text-dark">{weekLabel}</Text>
        <Button variant="secondary" onPress={nextWeek}>
          <ChevronRight size={18} color="#6b7280" />
        </Button>
      </View>

      {/* Horizontal day scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 8 }}>
        {weekDays.map((day) => {
          const dateStr = toDateString(day)
          const isToday = dateStr === TODAY_STRING
          const isPast = dateStr < TODAY_STRING
          const dayLabel = day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })

          return (
            <View
              key={dateStr}
              className={`w-44 gap-2 bg-surface dark:bg-surface-dark rounded-xl p-3 border ${isToday ? 'border-accent dark:border-accent-dark' : 'border-border dark:border-border-dark'} ${isPast ? 'opacity-60' : ''}`}
            >
              <Text className={`text-xs font-semibold ${isToday ? 'text-accent dark:text-accent-dark' : 'text-text-muted dark:text-text-muted-dark'}`}>
                {dayLabel}
              </Text>

              {orderedVisibleSlots.map((slot) => {
                const meal = getMeal(dateStr, slot)
                const recipe = meal ? recipeMap.get(meal.recipeId) : undefined
                const suggestion = !meal && !isPast ? suggestions.get(`${dateStr}::${slot}`) : undefined

                return (
                  <View key={slot} className="gap-1">
                    <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                      {t(`mealPlan.slot.${slot}`)}
                    </Text>

                    {meal && recipe ? (
                      /* Filled slot */
                      <View className="bg-bg dark:bg-bg-dark rounded-lg p-2 gap-1">
                        {recipe.imageUrl && (
                          <Image source={{ uri: recipe.imageUrl }} style={{ width: '100%', height: 60, borderRadius: 6 }} contentFit="cover" />
                        )}
                        <Pressable onPress={() => router.push(`/recipes/${recipe.id}?mealId=${meal.id}` as any)}>
                          <Text className="text-xs font-medium text-app-text dark:text-text-dark" numberOfLines={2}>
                            {recipe.titleI18n?.[language] || recipe.title}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => handleRemove(meal)} className="self-end active:opacity-70">
                          <X size={14} color="#6b7280" />
                        </Pressable>
                      </View>
                    ) : suggestion && autoSuggestEnabled ? (
                      /* Suggestion chip */
                      <View className="bg-bg dark:bg-bg-dark rounded-lg p-2 gap-1 border border-dashed border-accent dark:border-accent-dark">
                        <Text className="text-xs text-text-muted dark:text-text-muted-dark" numberOfLines={2}>
                          {suggestion.titleI18n?.[language] || suggestion.title}
                        </Text>
                        <View className="flex-row gap-1">
                          <Pressable
                            onPress={() => handleAccept(dateStr, slot, suggestion.id)}
                            className="flex-1 flex-row items-center justify-center bg-accent dark:bg-accent-dark rounded py-1 active:opacity-80"
                          >
                            <Check size={12} color="#ffffff" />
                          </Pressable>
                          <Pressable
                            onPress={() => setPicking({ date: dateStr, slot })}
                            className="flex-1 flex-row items-center justify-center bg-surface dark:bg-surface-dark rounded py-1 border border-border dark:border-border-dark active:opacity-80"
                          >
                            <Pencil size={12} color="#6b7280" />
                          </Pressable>
                        </View>
                      </View>
                    ) : !isPast ? (
                      /* Empty future slot */
                      <Pressable
                        onPress={() => setPicking({ date: dateStr, slot })}
                        className="flex-row items-center gap-1 py-2 active:opacity-70"
                      >
                        <Plus size={12} color="#7c3aed" />
                        <Text className="text-xs text-accent dark:text-accent-dark">{t('mealPlan.addMeal')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )
              })}
            </View>
          )
        })}
      </ScrollView>

      {picking && (
        <RecipePicker
          date={picking.date}
          slot={picking.slot}
          onPick={handlePick}
          onClose={() => setPicking(null)}
        />
      )}
    </View>
  )
}
