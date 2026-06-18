import { apiClient } from '../../lib/axiosClient'
import type { CreateRecipePayload, Recipe, UpdateRecipePayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

/** Returns all recipes. */
export async function fetchRecipes(): Promise<Recipe[]> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.fetchRecipes()
  }
  const { data } = await apiClient.get<Recipe[]>('/recipes')
  return data
}

/** Returns a single recipe by id. */
export async function fetchRecipeById(id: string): Promise<Recipe> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.fetchRecipeById(id)
  }
  const { data } = await apiClient.get<Recipe>(`/recipes/${id}`)
  return data
}

/** Creates a new recipe. */
export async function createRecipe(payload: CreateRecipePayload): Promise<Recipe> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.createRecipe(payload)
  }
  const { data } = await apiClient.post<Recipe>('/recipes', payload)
  return data
}

/** Updates an existing recipe. */
export async function updateRecipe(id: string, payload: UpdateRecipePayload): Promise<Recipe> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.updateRecipe(id, payload)
  }
  const { data } = await apiClient.put<Recipe>(`/recipes/${id}`, payload)
  return data
}

/** Deletes a recipe by id. */
export async function deleteRecipe(id: string): Promise<void> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.deleteRecipe(id)
  }
  await apiClient.delete(`/recipes/${id}`)
}

/** Toggles the isFavorite flag for a recipe. */
export async function toggleFavorite(id: string): Promise<Recipe> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.toggleFavorite(id)
  }
  const { data } = await apiClient.patch<Recipe>(`/recipes/${id}/favorite`)
  return data
}
