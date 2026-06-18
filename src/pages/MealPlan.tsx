import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchIngredients } from '../features/ingredients/ingredientsSlice'
import { WeekCalendar } from '../features/mealPlan/components/WeekCalendar'
import { fetchMealPlan } from '../features/mealPlan/mealPlanSlice'
import { fetchRecipes } from '../features/recipes/recipesSlice'
import { useLanguage } from '../i18n'

/**
 * Meal Planner page — weekly calendar view for assigning recipes to date + slot.
 */
export function MealPlan() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()

  const recipes = useAppSelector((s) => s.recipes.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)
  const mealPlan = useAppSelector((s) => s.mealPlan.items)

  useEffect(() => {
    if (recipes.length === 0) dispatch(fetchRecipes())
    if (ingredients.length === 0) dispatch(fetchIngredients())
    if (mealPlan.length === 0) dispatch(fetchMealPlan())
  }, [dispatch, recipes.length, ingredients.length, mealPlan.length])

  return (
    <div>
      <h1>{t('nav.mealPlan')}</h1>
      <WeekCalendar />
    </div>
  )
}
