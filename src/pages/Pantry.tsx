import { useEffect } from 'react'
import { ScrollView, View } from 'react-native'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchIngredients } from '../features/ingredients/ingredientsSlice'
import { PantryList } from '../features/pantry/components/PantryList'
import { RecipeMatcher } from '../features/pantry/components/RecipeMatcher'
import { fetchPantry } from '../features/pantry/pantrySlice'
import { fetchRecipes } from '../features/recipes/recipesSlice'

/** Route: /pantry — pantry inventory + recipe matcher stacked vertically on mobile. */
export function Pantry() {
  const dispatch = useAppDispatch()
  const recipes = useAppSelector((s) => s.recipes.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)
  const pantry = useAppSelector((s) => s.pantry.items)

  useEffect(() => {
    if (recipes.length === 0) dispatch(fetchRecipes())
    if (ingredients.length === 0) dispatch(fetchIngredients())
    if (pantry.length === 0) dispatch(fetchPantry())
  }, [dispatch, recipes.length, ingredients.length, pantry.length])

  return (
    <View className="flex-1">
      <PantryList />
    </View>
  )
}
