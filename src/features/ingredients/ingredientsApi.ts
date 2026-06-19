import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { CreateIngredientPayload, Ingredient, SubProduct, UpdateIngredientPayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

apiLog('ingredients', `module loaded · mode=${useMock ? 'MOCK' : 'Supabase'}`)

// ─── Row mappers (DB snake_case → TS camelCase) ────────────────────────────────

function mapSubproduct(row: Record<string, unknown>): SubProduct {
  return {
    id: row.id as string,
    name: row.name as string,
    nutrition: (row.nutrition as SubProduct['nutrition']) ?? undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    nameI18n: (row.name_i18n as Record<string, string>) ?? {},
  }
}

function mapIngredient(row: Record<string, unknown>): Ingredient {
  const subs = Array.isArray(row.ingredient_subproducts)
    ? (row.ingredient_subproducts as Record<string, unknown>[])
        .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0))
        .map(mapSubproduct)
    : []
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as Ingredient['category'],
    nutrition: (row.nutrition as Ingredient['nutrition']) ?? undefined,
    defaultExpiryDays: (row.default_expiry_days as number) ?? undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    density: (row.density as number) ?? undefined,
    nameI18n: (row.name_i18n as Record<string, string>) ?? {},
    subproducts: subs.length ? subs : undefined,
  }
}

function ingredientToDb(payload: Partial<CreateIngredientPayload>) {
  return {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.category !== undefined && { category: payload.category }),
    nutrition: payload.nutrition ?? null,
    default_expiry_days: payload.defaultExpiryDays ?? null,
    image_url: payload.imageUrl ?? null,
    density: payload.density ?? null,
    name_i18n: payload.nameI18n ?? {},
  }
}

// ─── API functions ─────────────────────────────────────────────────────────────

/** Returns all global ingredients. */
export async function fetchIngredients(): Promise<Ingredient[]> {
  if (useMock) {
    apiLog('ingredients', 'fetchIngredients (MOCK)')
    const mock = await import('../../mocks/mockApi')
    return mock.fetchIngredients()
  }

  apiLog('ingredients', 'fetchIngredients → Supabase ingredients + ingredient_subproducts')
  const { data, error } = await supabase
    .from('ingredients')
    .select('*, ingredient_subproducts(*)')
    .order('name')

  if (error) {
    apiLog('ingredients', 'fetchIngredients error:', error.message)
    throw new Error(error.message)
  }
  return (data ?? []).map((r) => mapIngredient(r as Record<string, unknown>))
}

/** Creates a new ingredient (and its subproducts). */
export async function createIngredient(payload: CreateIngredientPayload): Promise<Ingredient> {
  if (useMock) {
    apiLog('ingredients', 'createIngredient (MOCK)', payload.name)
    const mock = await import('../../mocks/mockApi')
    return mock.createIngredient(payload)
  }

  apiLog('ingredients', 'createIngredient → Supabase', payload.name)

  const { data: ing, error: ingErr } = await supabase
    .from('ingredients')
    .insert(ingredientToDb(payload))
    .select()
    .single()

  if (ingErr || !ing) throw new Error(ingErr?.message ?? 'Failed to create ingredient')

  // Insert subproducts if any
  const validSubs = (payload.subproducts ?? []).filter((sp) => sp.name.trim())
  if (validSubs.length) {
    const { error: spErr } = await supabase.from('ingredient_subproducts').insert(
      validSubs.map((sp, i) => ({
        ingredient_id: (ing as Record<string, unknown>).id,
        name: sp.name,
        nutrition: sp.nutrition ?? null,
        image_url: sp.imageUrl ?? null,
        name_i18n: sp.nameI18n ?? {},
        position: i,
      })),
    )
    if (spErr) throw new Error(spErr.message)
  }

  // Re-fetch with subproducts included
  const { data: full, error: fetchErr } = await supabase
    .from('ingredients')
    .select('*, ingredient_subproducts(*)')
    .eq('id', (ing as Record<string, unknown>).id)
    .single()

  if (fetchErr || !full) throw new Error(fetchErr?.message ?? 'Failed to fetch created ingredient')
  return mapIngredient(full as Record<string, unknown>)
}

/** Updates an existing ingredient (replaces subproducts in full). */
export async function updateIngredient(id: string, payload: UpdateIngredientPayload): Promise<Ingredient> {
  if (useMock) {
    apiLog('ingredients', `updateIngredient (MOCK) id=${id}`)
    const mock = await import('../../mocks/mockApi')
    return mock.updateIngredient(id, payload)
  }

  apiLog('ingredients', `updateIngredient → Supabase id=${id}`)

  const { error: updErr } = await supabase
    .from('ingredients')
    .update(ingredientToDb(payload))
    .eq('id', id)

  if (updErr) throw new Error(updErr.message)

  // Replace subproducts wholesale (delete + re-insert)
  await supabase.from('ingredient_subproducts').delete().eq('ingredient_id', id)

  const validSubs = (payload.subproducts ?? []).filter((sp) => sp.name.trim())
  if (validSubs.length) {
    const { error: spErr } = await supabase.from('ingredient_subproducts').insert(
      validSubs.map((sp, i) => ({
        ingredient_id: id,
        name: sp.name,
        nutrition: sp.nutrition ?? null,
        image_url: sp.imageUrl ?? null,
        name_i18n: sp.nameI18n ?? {},
        position: i,
      })),
    )
    if (spErr) throw new Error(spErr.message)
  }

  const { data: full, error: fetchErr } = await supabase
    .from('ingredients')
    .select('*, ingredient_subproducts(*)')
    .eq('id', id)
    .single()

  if (fetchErr || !full) throw new Error(fetchErr?.message ?? 'Failed to fetch updated ingredient')
  return mapIngredient(full as Record<string, unknown>)
}

/** Deletes an ingredient by id. */
export async function deleteIngredient(id: string): Promise<void> {
  if (useMock) {
    apiLog('ingredients', `deleteIngredient (MOCK) id=${id}`)
    const mock = await import('../../mocks/mockApi')
    return mock.deleteIngredient(id)
  }

  apiLog('ingredients', `deleteIngredient → Supabase id=${id}`)
  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
