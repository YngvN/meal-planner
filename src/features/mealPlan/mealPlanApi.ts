import { apiClient } from '../../lib/axiosClient'
import type { CreatePlannedMealPayload, PlannedMeal, UpdatePlannedMealPayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

/** Returns all planned meals. */
export async function fetchMealPlan(): Promise<PlannedMeal[]> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.fetchMealPlan()
  }
  const { data } = await apiClient.get<PlannedMeal[]>('/meal-plan')
  return data
}

/** Adds a recipe to a date + slot and returns the created entry. */
export async function addPlannedMeal(payload: CreatePlannedMealPayload): Promise<PlannedMeal> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.addPlannedMeal(payload)
  }
  const { data } = await apiClient.post<PlannedMeal>('/meal-plan', payload)
  return data
}

/** Updates an existing planned meal (e.g. change portions or slot). */
export async function updatePlannedMeal(id: string, payload: UpdatePlannedMealPayload): Promise<PlannedMeal> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.updatePlannedMeal(id, payload)
  }
  const { data } = await apiClient.patch<PlannedMeal>(`/meal-plan/${id}`, payload)
  return data
}

/** Removes a planned meal by id. */
export async function removePlannedMeal(id: string): Promise<void> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.removePlannedMeal(id)
  }
  await apiClient.delete(`/meal-plan/${id}`)
}
