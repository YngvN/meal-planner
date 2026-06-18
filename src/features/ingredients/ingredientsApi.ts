import { apiClient } from '../../lib/axiosClient'
import type { CreateIngredientPayload, Ingredient, UpdateIngredientPayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

/** Returns all global ingredients. */
export async function fetchIngredients(): Promise<Ingredient[]> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.fetchIngredients()
  }
  const { data } = await apiClient.get<Ingredient[]>('/ingredients')
  return data
}

/** Creates a new ingredient. */
export async function createIngredient(payload: CreateIngredientPayload): Promise<Ingredient> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.createIngredient(payload)
  }
  const { data } = await apiClient.post<Ingredient>('/ingredients', payload)
  return data
}

/** Updates an existing ingredient. */
export async function updateIngredient(id: string, payload: UpdateIngredientPayload): Promise<Ingredient> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.updateIngredient(id, payload)
  }
  const { data } = await apiClient.put<Ingredient>(`/ingredients/${id}`, payload)
  return data
}

/** Deletes an ingredient by id. */
export async function deleteIngredient(id: string): Promise<void> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.deleteIngredient(id)
  }
  await apiClient.delete(`/ingredients/${id}`)
}
