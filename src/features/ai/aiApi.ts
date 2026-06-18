import type {
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

const delay = (ms = 500) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** POSTs JSON to an AI endpoint and returns the parsed response. */
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => '')
    throw new Error(message || `AI request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

/**
 * Translates the given fields into each target language.
 * Mock mode prefixes each value with the language code so the flow is testable offline.
 */
export async function translateFields(payload: TranslateRequest): Promise<TranslateResponse> {
  if (useMock) {
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
    await delay(900)
    return {
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
  }

  const res = await postJson<RecipePhotoResponse>('/recipe-photo', { imageBase64, mediaType })
  return res.recipe
}

