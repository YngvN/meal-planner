import { useEffect } from 'react'
import { View } from 'react-native'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchIngredients } from '../features/ingredients/ingredientsSlice'
import { fetchMealPlan } from '../features/mealPlan/mealPlanSlice'
import { fetchPantry } from '../features/pantry/pantrySlice'
import { fetchRecipes } from '../features/recipes/recipesSlice'
import { ShoppingListView } from '../features/shoppingList/components/ShoppingListView'
import { useLanguage } from '../i18n'

/**
 * Shopping List page — auto-generated from the meal plan with manual item support.
 */
export function ShoppingList() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()

  const recipes = useAppSelector((s) => s.recipes.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const mealPlan = useAppSelector((s) => s.mealPlan.items)

  useEffect(() => {
    if (recipes.length === 0) dispatch(fetchRecipes())
    if (ingredients.length === 0) dispatch(fetchIngredients())
    if (pantryItems.length === 0) dispatch(fetchPantry())
    if (mealPlan.length === 0) dispatch(fetchMealPlan())
  }, [dispatch, recipes.length, ingredients.length, pantryItems.length, mealPlan.length])

  return (
    <View className="flex-1">
      <ShoppingListView />
    </View>
  )
}
