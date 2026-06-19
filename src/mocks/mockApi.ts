/**
 * Drop-in mock implementation of all feature API modules.
 * Returns copies of the in-memory arrays so mutations don't affect the source data.
 * Activated when VITE_USE_MOCK_DATA=true in .env.development.
 */
import type { CreateIngredientPayload, Ingredient, UpdateIngredientPayload } from '../features/ingredients/types'
import type { CreatePlannedMealPayload, PlannedMeal, UpdatePlannedMealPayload } from '../features/mealPlan/types'
import type { PantryItem, UpdatePantryItemPayload } from '../features/pantry/types'
import type { CreateRecipePayload, Recipe, UpdateRecipePayload } from '../features/recipes/types'
import { mockIngredients } from './mockIngredients'
import { mockMealPlan } from './mockMealPlan'
import { mockPantry } from './mockPantry'
import { mockRecipes } from './mockRecipes'

// ─── In-memory stores (seeded from static mock data) ─────────────────────────

let recipes: Recipe[] = mockRecipes.map((r) => ({ ...r }))
let ingredients: Ingredient[] = mockIngredients.map((i) => ({ ...i }))
let pantry: PantryItem[] = mockPantry.map((p) => ({ ...p }))
let mealPlan: PlannedMeal[] = mockMealPlan.map((m) => ({ ...m }))

const delay = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ─── Recipes ─────────────────────────────────────────────────────────────────

/** Returns all recipes. */
export async function fetchRecipes(): Promise<Recipe[]> {
  await delay()
  return recipes.map((r) => ({ ...r }))
}

/** Returns a single recipe by id, or throws if not found. */
export async function fetchRecipeById(id: string): Promise<Recipe> {
  await delay()
  const recipe = recipes.find((r) => r.id === id)
  if (!recipe) throw new Error(`Recipe ${id} not found`)
  return { ...recipe }
}

/** Creates a new recipe and returns it. */
export async function createRecipe(payload: CreateRecipePayload): Promise<Recipe> {
  await delay()
  const now = new Date().toISOString()
  const newRecipe: Recipe = {
    ...payload,
    id: `rec-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  recipes = [...recipes, newRecipe]
  return { ...newRecipe }
}

/** Updates an existing recipe and returns the updated version. */
export async function updateRecipe(id: string, payload: UpdateRecipePayload): Promise<Recipe> {
  await delay()
  let updated: Recipe | undefined
  recipes = recipes.map((r) => {
    if (r.id !== id) return r
    updated = { ...r, ...payload, updatedAt: new Date().toISOString() }
    return updated
  })
  if (!updated) throw new Error(`Recipe ${id} not found`)
  return { ...updated }
}

/** Deletes a recipe by id. */
export async function deleteRecipe(id: string): Promise<void> {
  await delay()
  recipes = recipes.filter((r) => r.id !== id)
}

/** Toggles the isFavorite flag for a recipe. */
export async function toggleFavorite(id: string): Promise<Recipe> {
  await delay()
  let updated: Recipe | undefined
  recipes = recipes.map((r) => {
    if (r.id !== id) return r
    updated = { ...r, isFavorite: !r.isFavorite, updatedAt: new Date().toISOString() }
    return updated
  })
  if (!updated) throw new Error(`Recipe ${id} not found`)
  return { ...updated }
}

// ─── Ingredients ──────────────────────────────────────────────────────────────

/** Returns all global ingredients. */
export async function fetchIngredients(): Promise<Ingredient[]> {
  await delay()
  return ingredients.map((i) => ({ ...i }))
}

/** Creates a new ingredient. */
export async function createIngredient(payload: CreateIngredientPayload): Promise<Ingredient> {
  await delay()
  const newIngredient: Ingredient = { ...payload, id: `ing-${Date.now()}` }
  ingredients = [...ingredients, newIngredient]
  return { ...newIngredient }
}

/** Updates an existing ingredient. */
export async function updateIngredient(id: string, payload: UpdateIngredientPayload): Promise<Ingredient> {
  await delay()
  let updated: Ingredient | undefined
  ingredients = ingredients.map((i) => {
    if (i.id !== id) return i
    updated = { ...i, ...payload }
    return updated
  })
  if (!updated) throw new Error(`Ingredient ${id} not found`)
  return { ...updated }
}

/** Deletes an ingredient by id. */
export async function deleteIngredient(id: string): Promise<void> {
  await delay()
  ingredients = ingredients.filter((i) => i.id !== id)
}

// ─── Pantry ───────────────────────────────────────────────────────────────────

/** Returns all pantry items. */
export async function fetchPantry(): Promise<PantryItem[]> {
  await delay()
  return pantry.map((p) => ({ ...p }))
}

/** Updates a single pantry item (upserts if not present). */
export async function updatePantryItem(ingredientId: string, payload: UpdatePantryItemPayload): Promise<PantryItem> {
  await delay()
  let found = false
  let updated: PantryItem | undefined
  pantry = pantry.map((p) => {
    if (p.ingredientId !== ingredientId) return p
    found = true
    updated = { ...p, ...payload }
    return updated
  })
  if (!found) {
    updated = { id: `mock-${Date.now()}`, ingredientId, inStock: false, isLow: false, ...payload }
    pantry = [...pantry, updated]
  }
  return { ...updated! }
}

/** Updates multiple pantry items in one call. */
export async function bulkUpdatePantry(updates: Array<{ ingredientId: string; id?: string; productId?: string } & UpdatePantryItemPayload>): Promise<PantryItem[]> {
  await delay()
  for (const update of updates) {
    const { ingredientId, ...payload } = update
    await updatePantryItem(ingredientId, payload)
  }
  return pantry.map((p) => ({ ...p }))
}

// ─── Meal Plan ────────────────────────────────────────────────────────────────

/** Returns all planned meals. */
export async function fetchMealPlan(): Promise<PlannedMeal[]> {
  await delay()
  return mealPlan.map((m) => ({ ...m }))
}

/** Adds a recipe to a date + slot and returns the created entry. */
export async function addPlannedMeal(payload: CreatePlannedMealPayload): Promise<PlannedMeal> {
  await delay()
  const newMeal: PlannedMeal = { ...payload, id: `mp-${Date.now()}` }
  mealPlan = [...mealPlan, newMeal]
  return { ...newMeal }
}

/** Updates an existing planned meal. */
export async function updatePlannedMeal(id: string, payload: UpdatePlannedMealPayload): Promise<PlannedMeal> {
  await delay()
  let updated: PlannedMeal | undefined
  mealPlan = mealPlan.map((m) => {
    if (m.id !== id) return m
    updated = { ...m, ...payload }
    return updated
  })
  if (!updated) throw new Error(`Planned meal ${id} not found`)
  return { ...updated }
}

/** Removes a planned meal by id. */
export async function removePlannedMeal(id: string): Promise<void> {
  await delay()
  mealPlan = mealPlan.filter((m) => m.id !== id)
}
