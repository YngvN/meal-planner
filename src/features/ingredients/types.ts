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

/** A single ingredient in the global ingredient library. */
export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
}

/** Fields required to create a new ingredient. */
export type CreateIngredientPayload = Omit<Ingredient, 'id'>

/** Fields that can be updated on an existing ingredient. */
export type UpdateIngredientPayload = Partial<CreateIngredientPayload>
