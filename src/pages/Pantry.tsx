import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchIngredients } from '../features/ingredients/ingredientsSlice'
import { PantryList } from '../features/pantry/components/PantryList'
import { RecipeMatcher } from '../features/pantry/components/RecipeMatcher'
import { fetchPantry } from '../features/pantry/pantrySlice'
import { fetchRecipes } from '../features/recipes/recipesSlice'
import './Pantry.scss'

/** Route: /pantry — pantry inventory + recipe matcher side by side. */
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
    <div className="pantry-page">
      <div className="pantry-page__inventory">
        <PantryList />
      </div>
      <div className="pantry-page__matcher">
        <RecipeMatcher />
      </div>
    </div>
  )
}
