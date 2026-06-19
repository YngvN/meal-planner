import { apiError, apiLog } from '../../lib/logger'
import { supabase } from '../../lib/supabaseClient'
import type {
  FrontPhotoProduct,
  FrontPhotoResponse,
  NutritionPhotoResponse,
  RecipeDraft,
  RecipePhotoResponse,
  TranslateRequest,
  TranslateResponse,
} from './types'
import type { NutritionalValues } from '../shared/types'

/**
 * AI client. Talks to the serverless functions at `/api/ai/*` which hold the
 * Anthropic API key server-side.
 *
 * The AI mock flag is independent of the data mock flag so the deployed site
 * can run on mock DATA (no data backend) while still calling the real AI
 * functions. `VITE_USE_MOCK_AI` takes precedence; if unset it falls back to
 * `VITE_USE_MOCK_DATA`. When mocked, returns stubbed responses so the UI works
 * without a key.
 */

const useMock =
  (import.meta.env.VITE_USE_MOCK_AI ?? import.meta.env.VITE_USE_MOCK_DATA) === 'true'

/** Base path for the serverless AI endpoints (same-origin on Netlify). */
const AI_BASE = import.meta.env.VITE_AI_API_BASE_URL ?? '/api/ai'

apiLog('ai', `config → base="${AI_BASE}" · mode=${useMock ? 'MOCK' : 'real functions'}`)

const delay = (ms = 500) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Retrieves the current session JWT for use in Netlify function requests. */
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

/** POSTs JSON to an AI endpoint and returns the parsed response. */
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const url = `${AI_BASE}${path}`
  apiLog('ai', `→ POST ${url}`)
  const authHeader = await getAuthHeader()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => '')
    apiError('ai', `✗ ${res.status} ${url}`, message)
    throw new Error(message || `AI request failed (${res.status})`)
  }
  apiLog('ai', `← ${res.status} ${url}`)
  return res.json() as Promise<T>
}

/**
 * Translates the given fields into each target language.
 * Mock mode prefixes each value with the language code so the flow is testable offline.
 */
export async function translateFields(payload: TranslateRequest): Promise<TranslateResponse> {
  if (useMock) {
    apiLog('ai', 'translateFields (MOCK)', payload.targetLanguages)
    await delay()
    const translations: TranslateResponse['translations'] = {}
    for (const lang of payload.targetLanguages) {
      const fields: Record<string, string> = {}
      for (const [key, value] of Object.entries(payload.fields)) {
        fields[key] = lang === 'en' ? value : `[${lang}] ${value}`
      }
      const arrayFields: Record<string, string[]> = {}
      for (const [key, values] of Object.entries(payload.arrayFields ?? {})) {
        arrayFields[key] = values.map((v) => (lang === 'en' ? v : `[${lang}] ${v}`))
      }
      translations[lang] = { fields, arrayFields }
    }
    return { translations }
  }

  apiLog('ai', 'translateFields (real)', payload.targetLanguages)
  return postJson<TranslateResponse>('/translate', payload)
}

/**
 * Transcribes a photo of a nutrition label into per-100g nutritional values.
 * Mock mode returns fixed sample values.
 */
export async function transcribeNutrition(
  imageBase64: string,
  mediaType: string,
): Promise<NutritionalValues> {
  if (useMock) {
    apiLog('ai', 'transcribeNutrition (MOCK)')
    await delay(800)
    return { calories: 250, protein: 8.5, carbs: 30, fat: 11, fiber: 2.4 }
  }

  const res = await postJson<NutritionPhotoResponse>('/nutrition-photo', {
    imageBase64,
    mediaType,
  })
  return res.nutrition
}

/**
 * Transcribes a photo of a recipe into a structured draft.
 * Mock mode returns a fixed sample recipe.
 */
export async function transcribeRecipe(
  imageBase64: string,
  mediaType: string,
): Promise<RecipeDraft> {
  if (useMock) {
    apiLog('ai', 'transcribeRecipe (MOCK)')
    await delay(900)
    return MOCK_RECIPE_DRAFT
  }

  const res = await postJson<RecipePhotoResponse>('/recipe-photo', { imageBase64, mediaType })
  return res.recipe
}

const MOCK_RECIPE_DRAFT: RecipeDraft = {
  title: 'Scanned Tomato Pasta',
  description: 'A simple weeknight pasta transcribed from a photo.',
  portions: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  ingredients: [
    { name: 'Spaghetti', quantity: 400, unit: 'g' },
    { name: 'Canned Tomatoes', quantity: 400, unit: 'g' },
    { name: 'Garlic', quantity: 2, unit: 'clove' },
    { name: 'Olive Oil', quantity: 2, unit: 'tbsp' },
  ],
  instructions: [
    'Boil the spaghetti until al dente.',
    'Gently fry the garlic in olive oil.',
    'Add the canned tomatoes and simmer.',
    'Toss the pasta in the sauce and serve.',
  ],
}

/**
 * Transcribes multiple recipe photos (e.g. several cookbook pages) into a
 * single unified draft. All images are sent in one Claude request so the
 * model can combine information across pages.
 * Mock mode returns the same fixed sample as `transcribeRecipe`.
 */
export async function transcribeRecipePhotos(
  images: Array<{ imageBase64: string; mediaType: string }>,
): Promise<RecipeDraft> {
  if (useMock) {
    apiLog('ai', `transcribeRecipePhotos (MOCK) count=${images.length}`)
    await delay(1200)
    return MOCK_RECIPE_DRAFT
  }

  apiLog('ai', `transcribeRecipePhotos (real) count=${images.length}`)
  const res = await postJson<RecipePhotoResponse>('/recipe-photos', { images })
  return res.recipe
}

/**
 * Extracts product name, brand, and net weight from a front-of-package photo.
 * Mock mode returns sample data so the wizard is testable without an AI key.
 */
export async function transcribeFrontOfPackage(
  imageBase64: string,
  mediaType: string,
): Promise<FrontPhotoProduct> {
  if (useMock) {
    apiLog('ai', 'transcribeFrontOfPackage (MOCK)')
    await delay(700)
    return { productName: 'Sample Product', brand: 'Generic Brand', netWeight: '400 g' }
  }

  const res = await postJson<FrontPhotoResponse>('/front-photo', { imageBase64, mediaType })
  return res.product
}

export interface ProductStandardizeInput {
  id: string
  name: string
  brand?: string
  ingredientName: string
  currentCategory: string
}

export interface ProductSuggestion {
  productId: string
  tags: string[]
  suggestedCategory?: string
}

/**
 * Sends all products to Claude for batch tag and category standardisation.
 * Admin only — the server enforces the role check.
 */
export async function standardizeProducts(
  products: ProductStandardizeInput[],
): Promise<ProductSuggestion[]> {
  if (useMock) {
    apiLog('ai', 'standardizeProducts (MOCK)')
    await delay(800)
    return products.slice(0, 3).map((p) => ({
      productId: p.id,
      tags: ['Condiment'],
      suggestedCategory: undefined,
    }))
  }

  const res = await postJson<{ suggestions: ProductSuggestion[] }>('/standardize-products', { products })
  return res.suggestions
}

