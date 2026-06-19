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
 * A specific branded product linked to an ingredient category.
 * E.g. "Mutti Polpa Chopped Tomatoes" linked to the "Canned Tomatoes" ingredient.
 */
export interface Product {
  id: string
  /** The parent ingredient category this product belongs to. */
  ingredientId: string
  name: string
  brand?: string
  /** EAN-13, UPC-A, QR code value, etc. */
  barcode?: string
  /** Format identifier returned by the barcode scanner (EAN_13, UPC_A, QR_CODE, …). */
  barcodeFormat?: string
  /** Per-100g/ml nutrition; falls back to parent ingredient nutrition when absent. */
  nutrition?: NutritionalValues
  /** URL to a front-of-package photo or product image. */
  imageUrl?: string
  /** Translated names keyed by language code. Falls back to `name` when missing. */
  nameI18n?: Record<string, string>
  /** Free-form descriptive tags set by AI standardisation (e.g. "Condiment", "Sauce"). */
  tags?: string[]
}

/** Fields required to create a new product. */
export type CreateProductPayload = Omit<Product, 'id'>

/** Fields that can be updated on an existing product. */
export type UpdateProductPayload = Partial<CreateProductPayload>

/**
 * An ingredient category in the global library (e.g. "Canned Tomatoes", "Olive Oil").
 * Specific brand products are listed under `products`.
 */
export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  /** When false, only the creator can see this ingredient. Default: true. */
  isGlobal?: boolean
  /** ID of the user who created this ingredient (null = legacy/seeded data). */
  userId?: string
  /** Category-level per-100g/ml nutritional values (fallback for products without their own). */
  nutrition?: NutritionalValues
  /** Typical shelf life in days — used to auto-set pantry expiry when toggled in-stock. */
  defaultExpiryDays?: number
  /** Specific branded products belonging to this category. */
  products?: Product[]
  /** URL to an image representing this ingredient category. */
  imageUrl?: string
  /**
   * Density in grams per ml.
   * Enables automatic volume ↔ weight conversion (e.g. flour ≈ 0.53, water = 1.0).
   */
  density?: number
  /** Translated names keyed by language code. Falls back to `name` when missing. */
  nameI18n?: Record<string, string>
}

/** Fields required to create a new ingredient. */
export type CreateIngredientPayload = Omit<Ingredient, 'id'>

/** Fields that can be updated on an existing ingredient. */
export type UpdateIngredientPayload = Partial<CreateIngredientPayload>
