import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { CreateProductPayload, IngredientCategory, PriceReport, Product, UpdateProductPayload } from './types'
import type { NutritionalValues } from '../shared/types'
import { normalizeOffLabel, offCategoryToIngredientCategory } from './offCategoryMap'

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
    tags: (row.tags as string[]) ?? [],
    stores: (row.stores as string[]) ?? [],
  }
}

function mapPriceReport(row: Record<string, unknown>): PriceReport {
  return {
    id: row.id as string,
    productId: row.product_id as string,
    reportedBy: row.reported_by as string,
    storeName: row.store_name as string,
    price: row.price as number,
    currency: row.currency as string,
    status: row.status as string,
    aiVerdict: (row.ai_verdict as string) ?? undefined,
    createdAt: row.created_at as string,
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
    ...(payload.tags !== undefined && { tags: payload.tags }),
    ...(payload.stores !== undefined && { stores: payload.stores }),
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Looks up a product in the local database by its barcode.
 * Returns null when no matching product is found.
 */
export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  if (useMock) return null
  apiLog('products', `findProductByBarcode ${barcode}`)
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle()
  if (error || !data) return null
  return mapProduct(data as Record<string, unknown>)
}

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
  /** Derived from OFF `categories_tags` — best-guess ingredient category. */
  suggestedCategory?: IngredientCategory
  /** Normalised label tags (e.g. "Organic", "Vegan") from OFF `labels_tags`. */
  tags?: string[]
  /** Store names where the product is sold, from OFF `stores`. */
  stores?: string[]
  /** Nutri-Score grade (a–e) from OFF. */
  nutriscoreGrade?: string
}

const OFF_CACHE_PREFIX = 'off_barcode_'

/**
 * Looks up a barcode in the Open Food Facts public database.
 * Results are cached in sessionStorage for the lifetime of the tab to avoid
 * redundant requests when the same barcode is scanned more than once.
 * Returns null when the product is not found or the request fails.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
  // Return from session cache if available.
  const cacheKey = OFF_CACHE_PREFIX + barcode
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached !== null) {
      apiLog('products', `lookupBarcode ${barcode} (cache hit)`)
      return cached === 'null' ? null : (JSON.parse(cached) as BarcodeResult)
    }
  } catch {
    // sessionStorage unavailable — proceed with network request.
  }

  apiLog('products', `lookupBarcode ${barcode} (fetching Open Food Facts)`)
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { headers: { 'User-Agent': 'Hungri/1.0 (https://hungri.netlify.app)' } },
    )
    if (!res.ok) {
      sessionStorage.setItem(cacheKey, 'null')
      return null
    }

    const json = (await res.json()) as Record<string, unknown>
    if ((json.status as number) !== 1 || !json.product) {
      sessionStorage.setItem(cacheKey, 'null')
      return null
    }

    const p = json.product as Record<string, unknown>
    const n = (p.nutriments ?? {}) as Record<string, number>

    const nutrition: NutritionalValues = {}
    if (n['energy-kcal_100g'] != null) nutrition.calories = n['energy-kcal_100g']
    if (n['proteins_100g'] != null) nutrition.protein = n['proteins_100g']
    if (n['carbohydrates_100g'] != null) nutrition.carbs = n['carbohydrates_100g']
    if (n['fat_100g'] != null) nutrition.fat = n['fat_100g']
    if (n['fiber_100g'] != null) nutrition.fiber = n['fiber_100g']
    const hasNutrition = Object.keys(nutrition).length > 0

    // Enrich with categories, labels, stores, nutriscore
    const categoryTags = (p.categories_tags as string[] | undefined) ?? []
    const labelTags = (p.labels_tags as string[] | undefined) ?? []
    const storesRaw = (p.stores as string | undefined) ?? ''
    const stores = storesRaw
      ? storesRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined
    const tags = labelTags.map(normalizeOffLabel).filter((t): t is string => t !== null)
    const suggestedCategory = categoryTags.length > 0
      ? offCategoryToIngredientCategory(categoryTags)
      : undefined
    const nutriscoreGrade = (p.nutriscore_grade as string | undefined) ?? undefined

    const result: BarcodeResult = {
      name: (p.product_name as string) ?? '',
      brand: (p.brands as string) ?? undefined,
      nutrition: hasNutrition ? nutrition : undefined,
      imageUrl: (p.image_front_url as string) ?? undefined,
      suggestedCategory,
      tags: tags.length > 0 ? tags : undefined,
      stores: stores?.length ? stores : undefined,
      nutriscoreGrade,
    }

    try { sessionStorage.setItem(cacheKey, JSON.stringify(result)) } catch { /* quota */ }
    return result
  } catch {
    apiLog('products', 'lookupBarcode failed — network or parse error')
    return null
  }
}

// ─── Price reports ────────────────────────────────────────────────────────────

/** Fetches the current active/approved price for each store for a product. */
export async function fetchCurrentPrices(productId: string): Promise<PriceReport[]> {
  if (useMock) return []
  apiLog('products', `fetchCurrentPrices ${productId}`)
  const { data, error } = await supabase
    .from('product_current_prices')
    .select('*')
    .eq('product_id', productId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapPriceReport(r as Record<string, unknown>))
}

/** Fetches ALL price reports (for admin moderation view). */
export async function fetchAllPriceReports(status?: string): Promise<PriceReport[]> {
  if (useMock) return []
  apiLog('products', `fetchAllPriceReports status=${status ?? 'all'}`)
  let query = supabase
    .from('product_price_reports')
    .select('*')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapPriceReport(r as Record<string, unknown>))
}

/**
 * Submits a price report for a product at a specific store.
 * Reports that are >50% above the current price are flagged as 'pending_review'.
 * Returns an object describing whether the report needs moderation.
 */
export async function reportProductPrice(
  productId: string,
  storeName: string,
  price: number,
  currency: string,
): Promise<{ status: 'active' | 'pending_review' }> {
  if (useMock) return { status: 'active' }
  apiLog('products', `reportProductPrice ${productId} ${storeName} ${price} ${currency}`)

  // Check if there is an existing active price to compare against.
  const existing = await fetchCurrentPrices(productId)
  const currentForStore = existing.find(
    (r) => r.storeName.toLowerCase() === storeName.toLowerCase(),
  )
  const status: 'active' | 'pending_review' =
    currentForStore && price > currentForStore.price * 1.5
      ? 'pending_review'
      : 'active'

  const { error } = await supabase.from('product_price_reports').insert({
    product_id: productId,
    store_name: storeName,
    price,
    currency,
    status,
    reported_by: (await supabase.auth.getUser()).data.user?.id,
  })
  if (error) throw new Error(error.message)
  return { status }
}

/** Admin: updates a price report's status (approve/reject). */
export async function updatePriceReportStatus(
  reportId: string,
  status: 'approved' | 'rejected',
  aiVerdict?: string,
): Promise<void> {
  if (useMock) return
  apiLog('products', `updatePriceReportStatus ${reportId} → ${status}`)
  const { error } = await supabase
    .from('product_price_reports')
    .update({
      status,
      ai_verdict: aiVerdict ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId)
  if (error) throw new Error(error.message)
}

// ─── Open Food Facts product search ───────────────────────────────────────────

const OFF_SEARCH_CACHE_PREFIX = 'off_search_'

export interface OFFSearchResult {
  barcode: string
  name: string
  brand?: string
  imageUrl?: string
  tags?: string[]
  stores?: string[]
  countries?: string[]
}

/**
 * Searches Open Food Facts by ingredient/product name.
 * Results are sorted so products available in `countryCode` appear first.
 * Caches results in sessionStorage per (query, country) pair.
 */
export async function searchOFFProducts(
  query: string,
  countryCode: string,
  limit = 5,
): Promise<OFFSearchResult[]> {
  const cacheKey = `${OFF_SEARCH_CACHE_PREFIX}${query}_${countryCode}`
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached !== null) {
      apiLog('products', `searchOFFProducts "${query}" (cache hit)`)
      return JSON.parse(cached) as OFFSearchResult[]
    }
  } catch { /* unavailable */ }

  apiLog('products', `searchOFFProducts "${query}" country=${countryCode}`)
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '15',
      fields: 'code,product_name,brands,image_front_url,labels_tags,countries_tags,stores',
    })
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`,
      { headers: { 'User-Agent': 'Hungri/1.0 (https://hungri.netlify.app)' } },
    )
    if (!res.ok) return []

    const json = (await res.json()) as { products?: Record<string, unknown>[] }
    const products = json.products ?? []

    const countryTag = `en:${countryCode.toLowerCase()}`

    const results: OFFSearchResult[] = products
      .filter((p) => p.product_name)
      .map((p) => {
        const labelTags = (p.labels_tags as string[] | undefined) ?? []
        const countriesTags = (p.countries_tags as string[] | undefined) ?? []
        const storesRaw = (p.stores as string | undefined) ?? ''
        return {
          barcode: (p.code as string) ?? '',
          name: (p.product_name as string) ?? '',
          brand: (p.brands as string) ?? undefined,
          imageUrl: (p.image_front_url as string) ?? undefined,
          tags: labelTags.map(normalizeOffLabel).filter((t): t is string => t !== null),
          stores: storesRaw ? storesRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          countries: countriesTags,
        }
      })
      // Sort: country-matching products first
      .sort((a, b) => {
        const aHas = a.countries?.includes(countryTag) ? -1 : 0
        const bHas = b.countries?.includes(countryTag) ? -1 : 0
        return aHas - bHas
      })
      .slice(0, limit)

    try { sessionStorage.setItem(cacheKey, JSON.stringify(results)) } catch { /* quota */ }
    return results
  } catch {
    apiLog('products', 'searchOFFProducts failed — network or parse error')
    return []
  }
}
