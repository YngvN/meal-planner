import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { CreateProductPayload, Product, UpdateProductPayload } from './types'
import type { NutritionalValues } from '../shared/types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// ─── Row mapper ────────────────────────────────────────────────────────────────

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

function productToDb(payload: Partial<CreateProductPayload>) {
  return {
    ...(payload.ingredientId !== undefined && { ingredient_id: payload.ingredientId }),
    ...(payload.name !== undefined && { name: payload.name }),
    brand: payload.brand ?? null,
    barcode: payload.barcode ?? null,
    barcode_format: payload.barcodeFormat ?? null,
    nutrition: payload.nutrition ?? null,
    image_url: payload.imageUrl ?? null,
    name_i18n: payload.nameI18n ?? {},
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** Returns all products for a specific ingredient category. */
export async function fetchProductsForIngredient(ingredientId: string): Promise<Product[]> {
  if (useMock) return []

  apiLog('products', `fetchProductsForIngredient id=${ingredientId}`)
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('ingredient_id', ingredientId)
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapProduct(r as Record<string, unknown>))
}

/** Creates a new product linked to an ingredient category. */
export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  if (useMock) {
    return { id: `mock-${Date.now()}`, ...payload }
  }

  apiLog('products', 'createProduct', payload.name)
  const { data, error } = await supabase
    .from('products')
    .insert(productToDb(payload))
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create product')
  return mapProduct(data as Record<string, unknown>)
}

/** Updates a product's details. */
export async function updateProduct(id: string, payload: UpdateProductPayload): Promise<Product> {
  if (useMock) {
    return { id, ingredientId: '', name: '', ...payload }
  }

  apiLog('products', `updateProduct id=${id}`)
  const { data, error } = await supabase
    .from('products')
    .update(productToDb(payload))
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update product')
  return mapProduct(data as Record<string, unknown>)
}

/** Deletes a product by id. */
export async function deleteProduct(id: string): Promise<void> {
  if (useMock) return

  apiLog('products', `deleteProduct id=${id}`)
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Open Food Facts barcode lookup ───────────────────────────────────────────

export interface BarcodeResult {
  name: string
  brand?: string
  nutrition?: NutritionalValues
  imageUrl?: string
}

/**
 * Looks up a barcode in the Open Food Facts public database.
 * Returns null when the product is not found or the request fails.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
  apiLog('products', `lookupBarcode ${barcode}`)
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      {
        headers: {
          'User-Agent': 'MealPlanner/1.0 (https://hungri.netlify.app)',
        },
      },
    )
    if (!res.ok) return null

    const json = (await res.json()) as Record<string, unknown>
    if ((json.status as number) !== 1 || !json.product) return null

    const p = json.product as Record<string, unknown>
    const n = (p.nutriments ?? {}) as Record<string, number>

    const nutrition: NutritionalValues = {}
    if (n['energy-kcal_100g'] != null) nutrition.calories = n['energy-kcal_100g']
    if (n['proteins_100g'] != null) nutrition.protein = n['proteins_100g']
    if (n['carbohydrates_100g'] != null) nutrition.carbs = n['carbohydrates_100g']
    if (n['fat_100g'] != null) nutrition.fat = n['fat_100g']
    if (n['fiber_100g'] != null) nutrition.fiber = n['fiber_100g']
    const hasNutrition = Object.keys(nutrition).length > 0

    return {
      name: (p.product_name as string) ?? '',
      brand: (p.brands as string) ?? undefined,
      nutrition: hasNutrition ? nutrition : undefined,
      imageUrl: (p.image_front_url as string) ?? undefined,
    }
  } catch {
    apiLog('products', 'lookupBarcode failed — network or parse error')
    return null
  }
}
