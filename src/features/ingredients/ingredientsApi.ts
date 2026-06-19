import { apiClient } from '../../lib/axiosClient'
import { apiLog } from '../../lib/logger'
import type { CreateIngredientPayload, Ingredient, UpdateIngredientPayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

apiLog('ingredients', `module loaded · mode=${useMock ? 'MOCK' : 'real API'}`)

/** Returns all global ingredients. */
export async function fetchIngredients(): Promise<Ingredient[]> {
  if (useMock) {
    apiLog('ingredients', 'fetchIngredients (MOCK)')
    const mock = await import('../../mocks/mockApi')
    return mock.fetchIngredients()
  }
  apiLog('ingredients', 'fetchIngredients (real API GET /ingredients)')
  const { data } = await apiClient.get<Ingredient[]>('/ingredients')
  return data
}

/** Creates a new ingredient. */
export async function createIngredient(payload: CreateIngredientPayload): Promise<Ingredient> {
  if (useMock) {
    apiLog('ingredients', 'createIngredient (MOCK — not persisted to backend)', payload)
    const mock = await import('../../mocks/mockApi')
    return mock.createIngredient(payload)
  }
  apiLog('ingredients', 'createIngredient (real API POST /ingredients)', payload)
  const { data } = await apiClient.post<Ingredient>('/ingredients', payload)
  return data
}

/** Updates an existing ingredient. */
export async function updateIngredient(id: string, payload: UpdateIngredientPayload): Promise<Ingredient> {
  if (useMock) {
    apiLog('ingredients', `updateIngredient (MOCK) id=${id}`, payload)
    const mock = await import('../../mocks/mockApi')
    return mock.updateIngredient(id, payload)
  }
  apiLog('ingredients', `updateIngredient (real API PUT /ingredients/${id})`, payload)
  const { data } = await apiClient.put<Ingredient>(`/ingredients/${id}`, payload)
  return data
}

/** Deletes an ingredient by id. */
export async function deleteIngredient(id: string): Promise<void> {
  if (useMock) {
    apiLog('ingredients', `deleteIngredient (MOCK) id=${id}`)
    const mock = await import('../../mocks/mockApi')
    return mock.deleteIngredient(id)
  }
  apiLog('ingredients', `deleteIngredient (real API DELETE /ingredients/${id})`)
  await apiClient.delete(`/ingredients/${id}`)
}
