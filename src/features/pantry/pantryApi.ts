import { apiClient } from '../../lib/axiosClient'
import { apiLog } from '../../lib/logger'
import type { PantryItem, UpdatePantryItemPayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

apiLog('pantry', `module loaded · mode=${useMock ? 'MOCK' : 'real API'}`)

/** Returns all pantry items. */
export async function fetchPantry(): Promise<PantryItem[]> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.fetchPantry()
  }
  const { data } = await apiClient.get<PantryItem[]>('/pantry')
  return data
}

/** Updates a single pantry item (upserts if not present). */
export async function updatePantryItem(ingredientId: string, payload: UpdatePantryItemPayload): Promise<PantryItem> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.updatePantryItem(ingredientId, payload)
  }
  const { data } = await apiClient.put<PantryItem>(`/pantry/${ingredientId}`, payload)
  return data
}

/** Updates multiple pantry items in a single request. */
export async function bulkUpdatePantry(
  updates: Array<{ ingredientId: string } & UpdatePantryItemPayload>,
): Promise<PantryItem[]> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.bulkUpdatePantry(updates)
  }
  const { data } = await apiClient.post<PantryItem[]>('/pantry/bulk', updates)
  return data
}
