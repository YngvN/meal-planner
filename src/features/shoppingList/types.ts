/**
 * A shopping list item derived from the meal plan.
 * Quantities are aggregated across all planned meals that need the ingredient.
 */
export interface DerivedShoppingItem {
  ingredientId: string
  quantity: number
  unit: string
  /** IDs of recipes that require this ingredient. */
  recipeIds: string[]
}

/**
 * A manually added shopping list item not tied to any recipe.
 */
export interface ManualShoppingItem {
  id: string
  name: string
  /** Free-form quantity string (e.g. "2", "1 bunch"). */
  quantity: string
  checked: boolean
}
