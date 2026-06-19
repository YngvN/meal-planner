import type { NutritionalValues } from '../shared/types'

/** Request body for the translate endpoint. */
export interface TranslateRequest {
  /** Single-string fields to translate, keyed by an arbitrary field name. */
  fields: Record<string, string>
  /** String-array fields to translate (e.g. instruction steps), keyed by field name. */
  arrayFields?: Record<string, string[]>
  /** Language codes to translate into (e.g. ['en', 'no']). */
  targetLanguages: string[]
}

/** Per-language translation of the requested fields. */
export interface TranslationForLanguage {
  fields: Record<string, string>
  arrayFields?: Record<string, string[]>
}

/** Response body from the translate endpoint. */
export interface TranslateResponse {
  /** Keyed by language code → translated fields. */
  translations: Record<string, TranslationForLanguage>
}

/** Request body for the nutrition-photo endpoint. */
export interface NutritionPhotoRequest {
  /** Base64-encoded image data (no data: prefix). */
  imageBase64: string
  /** MIME type, e.g. "image/jpeg" or "image/png". */
  mediaType: string
}

/** Response body from the nutrition-photo endpoint. */
export interface NutritionPhotoResponse {
  nutrition: NutritionalValues
}

/** A single parsed ingredient line from a recipe photo. */
export interface RecipeDraftIngredient {
  name: string
  quantity: number
  unit: string
  /** Alternative ingredient names (e.g. ["olivenolje"] for "smør eller olivenolje"). */
  alternatives?: string[]
}

/** A recipe parsed from a photo, before it is mapped onto the form / library. */
export interface RecipeDraft {
  title: string
  description?: string
  portions?: number
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  ingredients: RecipeDraftIngredient[]
  instructions: string[]
  mealTags?: string[]
  dietaryTags?: string[]
  cuisineTypes?: string[]
  equipment?: string[]
  skillLevel?: string
  tags?: string[]
}

/** Request body for the recipe-photo endpoint. */
export interface RecipePhotoRequest {
  imageBase64: string
  mediaType: string
}

/** Response body from the recipe-photo endpoint. */
export interface RecipePhotoResponse {
  recipe: RecipeDraft
}

/** Fields extracted from a front-of-package product photo. */
export interface FrontPhotoProduct {
  productName?: string
  brand?: string
  netWeight?: string
}

/** Response body from the front-photo endpoint. */
export interface FrontPhotoResponse {
  product: FrontPhotoProduct
}
