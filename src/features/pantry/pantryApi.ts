import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { PantryItem, UpdatePantryItemPayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

apiLog('pantry', `module loaded · mode=${useMock ? 'MOCK' : 'Supabase'}`)

// ─── Row mapper ────────────────────────────────────────────────────────────────

function mapPantryItem(row: Record<string, unknown>): PantryItem {
  return {
    ingredientId: row.ingredient_id as string,
    inStock: (row.in_stock as boolean) ?? false,
    quantity: (row.quantity as number) ?? undefined,
    unit: (row.unit as string) ?? undefined,
    isLow: (row.is_low as boolean) ?? false,
    expiresAt: (row.expires_at as string) ?? undefined,
  }
}

function pantryItemToDb(ingredientId: string, payload: UpdatePantryItemPayload) {
  return {
    ingredient_id: ingredientId,
    in_stock: payload.inStock ?? false,
    quantity: payload.quantity ?? null,
    unit: payload.unit ?? null,
    is_low: payload.isLow ?? false,
    expires_at: payload.expiresAt ?? null,
  }
}

// ─── API functions ─────────────────────────────────────────────────────────────

/** Returns all pantry items. */
export async function fetchPantry(): Promise<PantryItem[]> {
  if (useMock) {
    apiLog('pantry', 'fetchPantry (MOCK)')
    const mock = await import('../../mocks/mockApi')
    return mock.fetchPantry()
  }
  apiLog('pantry', 'fetchPantry → Supabase pantry_items')
  const { data, error } = await supabase.from('pantry_items').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapPantryItem(r as Record<string, unknown>))
}

/** Updates a single pantry item (upserts if not present). */
export async function updatePantryItem(
  ingredientId: string,
  payload: UpdatePantryItemPayload,
): Promise<PantryItem> {
  if (useMock) {
    apiLog('pantry', `updatePantryItem (MOCK) id=${ingredientId}`)
    const mock = await import('../../mocks/mockApi')
    return mock.updatePantryItem(ingredientId, payload)
  }
  apiLog('pantry', `updatePantryItem → Supabase id=${ingredientId}`)
  const { data, error } = await supabase
    .from('pantry_items')
    .upsert(pantryItemToDb(ingredientId, payload), { onConflict: 'ingredient_id' })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to update pantry item')
  return mapPantryItem(data as Record<string, unknown>)
}

/** Updates multiple pantry items in one call. */
export async function bulkUpdatePantry(
  updates: Array<{ ingredientId: string } & UpdatePantryItemPayload>,
): Promise<PantryItem[]> {
  if (useMock) {
    apiLog('pantry', `bulkUpdatePantry (MOCK) count=${updates.length}`)
    const mock = await import('../../mocks/mockApi')
    return mock.bulkUpdatePantry(updates)
  }
  apiLog('pantry', `bulkUpdatePantry → Supabase count=${updates.length}`)
  const rows = updates.map(({ ingredientId, ...payload }) =>
    pantryItemToDb(ingredientId, payload),
  )
  const { data, error } = await supabase
    .from('pantry_items')
    .upsert(rows, { onConflict: 'ingredient_id' })
    .select()
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapPantryItem(r as Record<string, unknown>))
}
