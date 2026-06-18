import type { NutritionalValues } from '../shared/types'

export type { NutritionalValues }

/** Grocery store section / category for an ingredient. */
export type IngredientCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'pantry'
  | 'frozen'
  | 'bakery'
  | 'beverages'
  | 'other'

/**
 * A named variant of an ingredient (e.g. "Whole Milk 3.5%", "Skimmed Milk 0.5%").
 * Shares the parent's category. Nutrition falls back to the parent when not set.
 */
export interface SubProduct {
  id: string
  name: string
  nutrition?: NutritionalValues
  /** URL to an image representing this variant. Falls back to parent ingredient image when absent. */
  imageUrl?: string
  /** Translated names keyed by language code. Falls back to `name` when missing. */
  nameI18n?: Record<string, string>
}

/** A single ingredient in the global ingredient library. */
export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  /** Per-100g/100ml nutritional values. */
  nutrition?: NutritionalValues
  /** Typical shelf life in days — used to auto-set pantry expiry when toggled in-stock. */
  defaultExpiryDays?: number
  /** Named variants of this ingredient (e.g. salted vs. unsalted butter). */
  subproducts?: SubProduct[]
  /** URL to an image representing this ingredient. */
  imageUrl?: string
  /**
   * Density in grams per ml.
   * Enables automatic volume ↔ weight conversion (e.g. flour ≈ 0.53, water = 1.0).
   * Leave blank when unknown or irrelevant (e.g. count-based ingredients).
   */
  density?: number
  /** Translated names keyed by language code. Falls back to `name` when missing. */
  nameI18n?: Record<string, string>
}

/** Fields required to create a new ingredient. */
export type CreateIngredientPayload = Omit<Ingredient, 'id'>

/** Fields that can be updated on an existing ingredient. */
export type UpdateIngredientPayload = Partial<CreateIngredientPayload>
