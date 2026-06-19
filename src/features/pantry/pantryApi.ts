import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { PantryItem, UpdatePantryItemPayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

apiLog('pantry', `module loaded · mode=${useMock ? 'MOCK' : 'Supabase'}`)

// ─── Row mapper ────────────────────────────────────────────────────────────────

function mapPantryItem(row: Record<string, unknown>): PantryItem {
  return {
    id: row.id as string,
    ingredientId: row.ingredient_id as string,
    productId: (row.product_id as string) ?? undefined,
    inStock: (row.in_stock as boolean) ?? false,
    quantity: (row.quantity as number) ?? undefined,
    unit: (row.unit as string) ?? undefined,
    isLow: (row.is_low as boolean) ?? false,
    expiresAt: (row.expires_at as string) ?? undefined,
  }
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ─── API functions ─────────────────────────────────────────────────────────────

/** Returns all pantry items for the current user. */
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

/**
 * Upserts a pantry item. If the item has an `id`, updates that row directly.
 * Otherwise inserts a new row (using partial unique indexes to prevent duplicates).
 */
export async function updatePantryItem(
  ingredientId: string,
  payload: UpdatePantryItemPayload,
  existingId?: string,
  productId?: string,
): Promise<PantryItem> {
  if (useMock) {
    apiLog('pantry', `updatePantryItem (MOCK) id=${ingredientId}`)
    const mock = await import('../../mocks/mockApi')
    return mock.updatePantryItem(ingredientId, payload)
  }

  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Not authenticated')

  const row = {
    user_id: userId,
    ingredient_id: ingredientId,
    product_id: productId ?? null,
    in_stock: payload.inStock ?? false,
    quantity: payload.quantity ?? null,
    unit: payload.unit ?? null,
    is_low: payload.isLow ?? false,
    expires_at: payload.expiresAt ?? null,
  }

  if (existingId) {
    // Update existing row by surrogate PK.
    apiLog('pantry', `updatePantryItem → Supabase UPDATE id=${existingId}`)
    const { data, error } = await supabase
      .from('pantry_items')
      .update(row)
      .eq('id', existingId)
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Failed to update pantry item')
    return mapPantryItem(data as Record<string, unknown>)
  }

  // Insert or upsert by unique constraint.
  apiLog('pantry', `updatePantryItem → Supabase INSERT ingredientId=${ingredientId}`)
  const conflictTarget = productId ? 'user_id,product_id' : 'user_id,ingredient_id'
  const { data, error } = await supabase
    .from('pantry_items')
    .upsert(row, { onConflict: conflictTarget })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update pantry item')
  return mapPantryItem(data as Record<string, unknown>)
}

/** Updates multiple pantry items in one call (used after shopping). */
export async function bulkUpdatePantry(
  updates: Array<{ ingredientId: string; id?: string; productId?: string } & UpdatePantryItemPayload>,
): Promise<PantryItem[]> {
  if (useMock) {
    apiLog('pantry', `bulkUpdatePantry (MOCK) count=${updates.length}`)
    const mock = await import('../../mocks/mockApi')
    return mock.bulkUpdatePantry(updates)
  }

  apiLog('pantry', `bulkUpdatePantry → Supabase count=${updates.length}`)
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Not authenticated')

  const results: PantryItem[] = []
  for (const { ingredientId, id, productId, ...payload } of updates) {
    const item = await updatePantryItem(ingredientId, payload, id, productId)
    results.push(item)
  }
  return results
}
