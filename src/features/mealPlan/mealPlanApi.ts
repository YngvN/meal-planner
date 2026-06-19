import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { CreatePlannedMealPayload, PlannedMeal, UpdatePlannedMealPayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

apiLog('mealPlan', `module loaded · mode=${useMock ? 'MOCK' : 'Supabase'}`)

// ─── Row mapper ────────────────────────────────────────────────────────────────

function mapPlannedMeal(row: Record<string, unknown>): PlannedMeal {
  return {
    id: row.id as string,
    date: row.date as string,
    slot: row.slot as PlannedMeal['slot'],
    recipeId: row.recipe_id as string,
    portions: (row.portions as number) ?? undefined,
  }
}

// ─── API functions ─────────────────────────────────────────────────────────────

/** Returns all planned meals. */
export async function fetchMealPlan(): Promise<PlannedMeal[]> {
  if (useMock) {
    apiLog('mealPlan', 'fetchMealPlan (MOCK)')
    const mock = await import('../../mocks/mockApi')
    return mock.fetchMealPlan()
  }
  apiLog('mealPlan', 'fetchMealPlan → Supabase planned_meals')
  const { data, error } = await supabase
    .from('planned_meals')
    .select('*')
    .order('date')
    .order('slot')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapPlannedMeal(r as Record<string, unknown>))
}

/** Adds a recipe to a date + slot. */
export async function addPlannedMeal(payload: CreatePlannedMealPayload): Promise<PlannedMeal> {
  if (useMock) {
    apiLog('mealPlan', 'addPlannedMeal (MOCK)', payload.date, payload.slot)
    const mock = await import('../../mocks/mockApi')
    return mock.addPlannedMeal(payload)
  }
  apiLog('mealPlan', 'addPlannedMeal → Supabase', payload.date, payload.slot)
  const { data, error } = await supabase
    .from('planned_meals')
    .insert({
      date: payload.date,
      slot: payload.slot,
      recipe_id: payload.recipeId,
      portions: payload.portions ?? null,
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to add planned meal')
  return mapPlannedMeal(data as Record<string, unknown>)
}

/** Updates an existing planned meal. */
export async function updatePlannedMeal(
  id: string,
  payload: UpdatePlannedMealPayload,
): Promise<PlannedMeal> {
  if (useMock) {
    apiLog('mealPlan', `updatePlannedMeal (MOCK) id=${id}`)
    const mock = await import('../../mocks/mockApi')
    return mock.updatePlannedMeal(id, payload)
  }
  apiLog('mealPlan', `updatePlannedMeal → Supabase id=${id}`)
  const { data, error } = await supabase
    .from('planned_meals')
    .update({
      ...(payload.date !== undefined && { date: payload.date }),
      ...(payload.slot !== undefined && { slot: payload.slot }),
      ...(payload.recipeId !== undefined && { recipe_id: payload.recipeId }),
      ...(payload.portions !== undefined && { portions: payload.portions }),
    })
    .eq('id', id)
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to update planned meal')
  return mapPlannedMeal(data as Record<string, unknown>)
}

/** Removes a planned meal by id. */
export async function removePlannedMeal(id: string): Promise<void> {
  if (useMock) {
    apiLog('mealPlan', `removePlannedMeal (MOCK) id=${id}`)
    const mock = await import('../../mocks/mockApi')
    return mock.removePlannedMeal(id)
  }
  apiLog('mealPlan', `removePlannedMeal → Supabase id=${id}`)
  const { error } = await supabase.from('planned_meals').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
