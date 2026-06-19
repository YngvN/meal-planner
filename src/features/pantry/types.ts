/** Tracks the user's current stock of one ingredient (category) or specific product. */
export interface PantryItem {
  /** Surrogate primary key from the database. */
  id: string
  ingredientId: string
  /** When set, this row tracks a specific branded product rather than the ingredient category. */
  productId?: string
  inStock: boolean
  quantity?: number
  unit?: string
  /** True when the user has flagged this as running low. */
  isLow: boolean
  /** ISO 8601 date string for when the item expires, if tracked. */
  expiresAt?: string
}

/** Payload for updating a single pantry item. */
export type UpdatePantryItemPayload = Partial<Omit<PantryItem, 'id' | 'ingredientId' | 'productId'>>

/** Result from the "what can I make?" matcher for one recipe. */
export interface RecipeMatch {
  recipeId: string
  /** 0–1 ratio of how many required ingredients are in stock. */
  matchRatio: number
  missingIngredientIds: string[]
}
