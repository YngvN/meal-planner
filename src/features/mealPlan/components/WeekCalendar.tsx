import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
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

const TODAY_STRING = toDateString(new Date())

/**
 * Weekly meal planning calendar. Shows Mon–Sun with four meal slots per day.
 * Users can add or remove planned meals from each slot.
 */
export function WeekCalendar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const plannedMeals = useAppSelector((s) => s.mealPlan.items)
  const recipes = useAppSelector((s) => s.recipes.items)
  const recipeMap = new Map(recipes.map((r) => [r.id, r]))

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

  /** Meals for a specific date+slot. */
  function getMeal(dateStr: string, slot: MealSlot): PlannedMeal | undefined {
    return plannedMeals.find((m) => m.date === dateStr && m.slot === slot)
  }

  async function handlePick(recipeId: string) {
    if (!picking) return
    await dispatch(addPlannedMeal({ date: picking.date, slot: picking.slot, recipeId }))
    setPicking(null)
  }

  function handleRemove(meal: PlannedMeal) {
    dispatch(removePlannedMeal(meal.id))
  }

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
          const dayLabel = day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })

          return (
            <div
              key={dateStr}
              className={`week-calendar__day${isToday ? ' week-calendar__day--today' : ''}`}
            >
              <h3 className="week-calendar__day-label">{dayLabel}</h3>

              {MEAL_SLOT_ORDER.map((slot) => {
                const meal = getMeal(dateStr, slot)
                const recipe = meal ? recipeMap.get(meal.recipeId) : undefined

                return (
                  <div key={slot} className="week-calendar__slot">
                    <span className="week-calendar__slot-name">{t(`mealPlan.slot.${slot}`)}</span>

                    {meal && recipe ? (
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
                          onClick={() => navigate(`/recipes/${recipe.id}`)}
                        >
                          {recipe.title}
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
                    ) : (
                      <button
                        type="button"
                        className="week-calendar__add"
                        onClick={() => setPicking({ date: dateStr, slot })}
                        aria-label={t('mealPlan.addMeal')}
                      >
                        + {t('mealPlan.addMeal')}
                      </button>
                    )}
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
