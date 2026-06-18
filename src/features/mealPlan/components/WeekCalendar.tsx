import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { suggestForSlot } from '../utils/scoring'
import { addPlannedMeal, removePlannedMeal } from '../mealPlanSlice'
import { MEAL_SLOT_ORDER, type MealSlot, type PlannedMeal } from '../types'
import { RecipePicker } from './RecipePicker'
import './WeekCalendar.scss'

/** Returns the Monday of the week containing the given date. */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
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

/** Number of future days (from today) for which suggestions are computed. */
const SUGGESTION_HORIZON_DAYS = 7

/** How many days ahead is "expiring soon" for the scoring boost. */
const EXPIRY_WINDOW_DAYS = 5

/**
 * Weekly meal planning calendar. Shows Mon–Sun with the user's chosen meal slots per day.
 * Empty future slots show an auto-suggested recipe (when enabled in settings) with a ✓ button
 * to accept or … to pick a different recipe.
 */
export function WeekCalendar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
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
      const d = new Date(s)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  function nextWeek() {
    setWeekStart((s) => {
      const d = new Date(s)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  /** Meals for a specific date+slot from the full plan. */
  function getMeal(dateStr: string, slot: MealSlot): PlannedMeal | undefined {
    return allPlannedMeals.find((m) => m.date === dateStr && m.slot === slot)
  }

  /**
   * Scoring context — built once per render from Redux state.
   * Covers all slots in the next SUGGESTION_HORIZON_DAYS days.
   */
  const suggestions = useMemo(() => {
    if (!autoSuggestEnabled || recipes.length === 0) return new Map<string, (typeof recipes)[0]>()

    // Horizon: today + SUGGESTION_HORIZON_DAYS days
    const horizonEnd = new Date(TODAY_STRING + 'T00:00:00')
    horizonEnd.setDate(horizonEnd.getDate() + SUGGESTION_HORIZON_DAYS)
    const horizonEndStr = toDateString(horizonEnd)

    // Pantry sets
    const pantryInStockIds = new Set(pantryItems.filter((p) => p.inStock).map((p) => p.ingredientId))
    const expiryThreshold = new Date(TODAY_STRING + 'T00:00:00')
    expiryThreshold.setDate(expiryThreshold.getDate() + EXPIRY_WINDOW_DAYS)
    const expiringIds = new Set(
      pantryItems
        .filter((p) => p.expiresAt && new Date(p.expiresAt) <= expiryThreshold)
        .map((p) => p.ingredientId),
    )

    // Per-recipe usage counts and last-used dates from all history
    const usageCounts = new Map<string, number>()
    const lastUsedDates = new Map<string, string>()
    for (const meal of allPlannedMeals) {
      usageCounts.set(meal.recipeId, (usageCounts.get(meal.recipeId) ?? 0) + 1)
      const prev = lastUsedDates.get(meal.recipeId)
      if (!prev || meal.date > prev) lastUsedDates.set(meal.recipeId, meal.date)
    }

    const result = new Map<string, (typeof recipes)[0]>()

    // Iterate every day in the visible week
    for (const day of weekDays) {
      const dateStr = toDateString(day)
      if (dateStr < TODAY_STRING || dateStr > horizonEndStr) continue

      // Week context: all meals already planned in the same calendar week
      const weekStart7 = toDateString(getWeekStart(day))
      const weekEnd7 = toDateString(weekDays[6])
      const weekMeals = allPlannedMeals.filter(
        (m) => m.date >= weekStart7 && m.date <= weekEnd7,
      )
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
  }, [
    autoSuggestEnabled,
    recipes,
    pantryItems,
    allPlannedMeals,
    visibleSlots,
    scoringFactors,
    weekDays,
    recipeMap,
  ])

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

  // Honour user-defined slot order (preserve MEAL_SLOT_ORDER sort for display)
  const orderedVisibleSlots = MEAL_SLOT_ORDER.filter((s) => visibleSlots.includes(s))

  return (
    <div className="week-calendar">
      <div className="week-calendar__nav">
        <Button variant="secondary" onClick={prevWeek} aria-label={t('mealPlan.prevWeek')}>
          ‹
        </Button>
        <span className="week-calendar__week-label">{weekLabel}</span>
        <Button variant="secondary" onClick={nextWeek} aria-label={t('mealPlan.nextWeek')}>
          ›
        </Button>
      </div>

      <div className="week-calendar__grid">
        {weekDays.map((day) => {
          const dateStr = toDateString(day)
          const isToday = dateStr === TODAY_STRING
          const isPast = dateStr < TODAY_STRING
          const dayLabel = day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })

          return (
            <div
              key={dateStr}
              className={`week-calendar__day${isToday ? ' week-calendar__day--today' : ''}${isPast ? ' week-calendar__day--past' : ''}`}
            >
              <h3 className="week-calendar__day-label">{dayLabel}</h3>

              {orderedVisibleSlots.map((slot) => {
                const meal = getMeal(dateStr, slot)
                const recipe = meal ? recipeMap.get(meal.recipeId) : undefined
                const suggestion = !meal && !isPast ? suggestions.get(`${dateStr}::${slot}`) : undefined

                return (
                  <div key={slot} className="week-calendar__slot">
                    <span className="week-calendar__slot-name">{t(`mealPlan.slot.${slot}`)}</span>

                    {meal && recipe ? (
                      /* ── Filled slot ── */
                      <div className="week-calendar__meal">
                        {recipe.imageUrl && (
                          <img
                            src={recipe.imageUrl}
                            alt=""
                            className="week-calendar__meal-thumb"
                            loading="lazy"
                          />
                        )}
                        <button
                          type="button"
                          className="week-calendar__meal-title"
                          onClick={() => navigate(`/recipes/${recipe.id}?mealId=${meal.id}`)}
                        >
                          {recipe.titleI18n?.[language] || recipe.title}
                        </button>
                        <button
                          type="button"
                          className="week-calendar__remove"
                          onClick={() => handleRemove(meal)}
                          aria-label={t('common.delete')}
                        >
                          ×
                        </button>
                      </div>
                    ) : suggestion && autoSuggestEnabled ? (
                      /* ── Suggestion chip ── */
                      <div className="week-calendar__suggestion">
                        {suggestion.imageUrl && (
                          <img
                            src={suggestion.imageUrl}
                            alt=""
                            className="week-calendar__suggestion-thumb"
                            loading="lazy"
                          />
                        )}
                        <span className="week-calendar__suggestion-title">{suggestion.titleI18n?.[language] || suggestion.title}</span>
                        <button
                          type="button"
                          className="week-calendar__suggestion-accept"
                          onClick={() => handleAccept(dateStr, slot, suggestion.id)}
                          aria-label={t('mealPlan.acceptSuggestion')}
                          title={t('mealPlan.acceptSuggestion')}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="week-calendar__suggestion-override"
                          onClick={() => setPicking({ date: dateStr, slot })}
                          aria-label={t('mealPlan.overrideSuggestion')}
                          title={t('mealPlan.overrideSuggestion')}
                        >
                          …
                        </button>
                      </div>
                    ) : !isPast ? (
                      /* ── Empty future slot ── */
                      <button
                        type="button"
                        className="week-calendar__add"
                        onClick={() => setPicking({ date: dateStr, slot })}
                        aria-label={t('mealPlan.addMeal')}
                      >
                        + {t('mealPlan.addMeal')}
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {picking && (
        <RecipePicker
          date={picking.date}
          slot={picking.slot}
          onPick={handlePick}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}
