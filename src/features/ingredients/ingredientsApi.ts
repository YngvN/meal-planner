import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { CreateIngredientPayload, Ingredient, Product, UpdateIngredientPayload } from './types'
import type { NutritionalValues } from '../shared/types'

const useMock = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true'

apiLog('ingredients', `module loaded · mode=${useMock ? 'MOCK' : 'Supabase'}`)

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    ingredientId: row.ingredient_id as string,
    name: row.name as string,
    brand: (row.brand as string) ?? undefined,
    barcode: (row.barcode as string) ?? undefined,
    barcodeFormat: (row.barcode_format as string) ?? undefined,
    nutrition: (row.nutrition as NutritionalValues) ?? undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    nameI18n: (row.name_i18n as Record<string, string>) ?? {},
  }
}

function mapIngredient(row: Record<string, unknown>): Ingredient {
  const products = Array.isArray(row.products)
    ? (row.products as Record<string, unknown>[])
        .sort((a, b) => ((a.name as string) ?? '').localeCompare((b.name as string) ?? ''))
        .map(mapProduct)
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
    products: products.length ? products : undefined,
    isGlobal: (row.is_global as boolean) ?? true,
    userId: (row.user_id as string) ?? undefined,
  }
}

function ingredientToDb(payload: Partial<CreateIngredientPayload>, userId?: string) {
  return {
    ...(payload.name !== undefined && { name: payload.name }),
    ...(payload.category !== undefined && { category: payload.category }),
    nutrition: payload.nutrition ?? null,
    default_expiry_days: payload.defaultExpiryDays ?? null,
    image_url: payload.imageUrl ?? null,
    density: payload.density ?? null,
    name_i18n: payload.nameI18n ?? {},
    ...(userId !== undefined && { user_id: userId }),
    ...(payload.isGlobal !== undefined && { is_global: payload.isGlobal }),
  }
}

// ─── API functions ────────────────────────────────────────────────────────────

/** Returns all visible ingredients with their products. */
export async function fetchIngredients(): Promise<Ingredient[]> {
  if (useMock) {
    apiLog('ingredients', 'fetchIngredients (MOCK)')
    const mock = await import('../../mocks/mockApi')
    return mock.fetchIngredients()
  }

  apiLog('ingredients', 'fetchIngredients → Supabase ingredients + products')
  const { data, error } = await supabase
    .from('ingredients')
    .select('*, products(*)')
    .order('name')

  if (error) {
    apiLog('ingredients', 'fetchIngredients error:', error.message)
    throw new Error(error.message)
  }
  return (data ?? []).map((r) => mapIngredient(r as Record<string, unknown>))
}

/** Creates a new ingredient category (products are added separately). */
export async function createIngredient(payload: CreateIngredientPayload): Promise<Ingredient> {
  if (useMock) {
    apiLog('ingredients', 'createIngredient (MOCK)', payload.name)
    const mock = await import('../../mocks/mockApi')
    return mock.createIngredient(payload)
  }

  apiLog('ingredients', 'createIngredient → Supabase', payload.name)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: ing, error: ingErr } = await supabase
    .from('ingredients')
    .insert(ingredientToDb(payload, user?.id))
    .select()
    .single()

  if (ingErr || !ing) throw new Error(ingErr?.message ?? 'Failed to create ingredient')

  const { data: full, error: fetchErr } = await supabase
    .from('ingredients')
    .select('*, products(*)')
    .eq('id', (ing as Record<string, unknown>).id)
    .single()

  if (fetchErr || !full) throw new Error(fetchErr?.message ?? 'Failed to fetch created ingredient')
  return mapIngredient(full as Record<string, unknown>)
}

/** Updates an existing ingredient category's metadata. */
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

  const { data: full, error: fetchErr } = await supabase
    .from('ingredients')
    .select('*, products(*)')
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
