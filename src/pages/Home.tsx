import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Badge, Button } from '../components'
import { useAppDispatch, useAppSelector } from '../app/hooks'
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
import './Home.scss'

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
  const navigate = useNavigate()
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
    <div className="home">
      {/* ── Next meal ─────────────────────────────────────────────────────── */}
      <section className="home__section">
        <h2 className="home__section-title">{t('home.nextMeal')}</h2>
        {nextMeal && nextMealRecipe ? (
          <div className="home__next-meal" onClick={() => navigate(`/recipes/${nextMealRecipe.id}?mealId=${nextMeal.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/recipes/${nextMealRecipe.id}?mealId=${nextMeal.id}`)}>
            {nextMealRecipe.imageUrl && (
              <img src={nextMealRecipe.imageUrl} alt="" className="home__next-meal-img" />
            )}
            <div className="home__next-meal-body">
              <span className="home__next-meal-when">
                {dateLabel(nextMeal.date)} · {t(`mealPlan.slot.${nextMeal.slot}`)}
              </span>
              <span className="home__next-meal-title">{nextMealRecipe.titleI18n?.[language] || nextMealRecipe.title}</span>
              <span className="home__next-meal-meta">
                {nextMealRecipe.portions} {t('recipes.portions').toLowerCase()} · {nextMealRecipe.prepTimeMinutes + nextMealRecipe.cookTimeMinutes} {t('recipes.minutes')}
              </span>
            </div>
            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); navigate('/meal-plan') }}>
              {t('home.planMeals')}
            </Button>
          </div>
        ) : (
          <div className="home__no-next-meal">
            <p className="home__all-fresh">{t('home.noMealsPlanned')}</p>
            <Button onClick={() => navigate('/meal-plan')}>{t('home.planMeals')}</Button>
          </div>
        )}
      </section>

      {/* ── What can I make ───────────────────────────────────────────────── */}
      <section className="home__section">
        <h2 className="home__section-title">{t('home.whatCanIMake')}</h2>
        <RecipeMatcher limit={5} />
      </section>

      {/* ── Expiring soon ─────────────────────────────────────────────────── */}
      <section className="home__section">
        <h2 className="home__section-title">{t('home.expiringSoon')}</h2>
        {expiringSoon.length === 0 ? (
          <p className="home__all-fresh">
            <Badge variant="success">{t('home.allFresh')}</Badge>
          </p>
        ) : (
          <ul className="home__expiry-list">
            {expiringSoon.map((item) => {
              const ing = ingredientMap.get(item.ingredientId)
              if (!ing) return null
              const days = daysUntilExpiry(item.expiresAt!)
              const isUrgent = days <= 2

              return (
                <li key={item.ingredientId} className="home__expiry-item">
                  <span className="home__expiry-name">{localizedIngredientName(ing, language)}</span>
                  <Badge variant={isUrgent ? 'error' : 'warning'}>
                    {t('home.daysLeft', { count: String(days) })}
                  </Badge>
                  <button
                    type="button"
                    className="home__expiry-link"
                    onClick={() => navigate('/pantry')}
                  >
                    {t('pantry.title')} <ArrowRight size={14} aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Things to do ──────────────────────────────────────────────────── */}
      <section className="home__section">
        <h2 className="home__section-title">{t('home.thingsToDo')}</h2>
        {incompleteIngredients.length === 0 ? (
          <p className="home__all-fresh">
            <Badge variant="success">{t('home.allComplete')}</Badge>
          </p>
        ) : (
          <>
            <p className="home__todo-count">
              {t('home.ingredientsNeedAttention', { count: String(ingredients.filter((i) => getMissingFields(i).length > 0).length) })}
            </p>
            <ul className="home__todo-list">
              {incompleteIngredients.map(({ ing, missing }) => (
                <li key={ing.id} className="home__todo-item">
                  {ing.imageUrl && (
                    <img src={ing.imageUrl} alt="" className="home__todo-thumb" />
                  )}
                  <span className="home__todo-name">{localizedIngredientName(ing, language)}</span>
                  <span className="home__todo-missing">
                    {t('home.missingData', { items: missing.map((k) => t(`ingredients.${k}`)).join(', ') })}
                  </span>
                  <button
                    type="button"
                    className="home__expiry-link"
                    onClick={() => navigate(`/ingredients?edit=${ing.id}`)}
                  >
                    {t('common.edit')} <ArrowRight size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── Needs translation ─────────────────────────────────────────────── */}
      <TranslationTodo />
    </div>
  )
}
