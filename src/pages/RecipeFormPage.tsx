import { useEffect } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Spinner } from '../components'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchIngredients } from '../features/ingredients/ingredientsSlice'
import { RecipeForm } from '../features/recipes/components/RecipeForm'
import { fetchRecipeById } from '../features/recipes/recipesSlice'

/** Route: /recipes/new and /recipes/:id/edit */
export function RecipeFormPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const dispatch = useAppDispatch()

  const { selectedRecipe, status } = useAppSelector((s) => s.recipes)
  const ingredients = useAppSelector((s) => s.ingredients.items)

  useEffect(() => {
    if (ingredients.length === 0) dispatch(fetchIngredients())
    if (id) dispatch(fetchRecipeById(id))
  }, [dispatch, id, ingredients.length])

  // Show spinner while loading the recipe to edit
  if (id && status === 'loading') return <Spinner />

  const initialValues = id && selectedRecipe?.id === id ? selectedRecipe : undefined

  // Don't render form until recipe is loaded in edit mode
  if (id && !initialValues) return <Spinner />

  return <RecipeForm initialValues={initialValues} />
}
