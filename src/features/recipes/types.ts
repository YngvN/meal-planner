import type { NutritionalValues } from '../shared/types'

export type { NutritionalValues }

/** Difficulty level of a recipe. */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

/** Dietary classifications that can be applied to a recipe. */
export type DietaryTag = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free'

/** Seasons the recipe is best suited for. */
export type SeasonalTag = 'spring' | 'summer' | 'autumn' | 'winter'

/** Which meal occasion the recipe fits. */
export type MealTag = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'

/** Where the recipe was sourced from. */
export type RecipeSourceType = 'website' | 'book' | 'person'

/** Attribution for the origin of a recipe. */
export interface RecipeSource {
  type: RecipeSourceType
  /** Display name: website name, book title, or person's name. */
  name: string
  /** URL — only relevant when type is 'website'. */
  url?: string
}

/** One ingredient reference inside a recipe, with quantity and unit. */
export interface RecipeIngredient {
  ingredientId: string
  quantity: number
  unit: string
  /** References a specific subproduct variant; falls back to parent nutrition if absent. */
  subproductId?: string
}

/** A single step in the recipe instructions. */
export interface RecipeStep {
  order: number
  description: string
  /** Optional timer duration in minutes shown during cooking mode. */
  timerMinutes?: number
}

/** Full recipe entity as stored and returned by the API. */
export interface Recipe {
  id: string
  title: string
  description: string
  instructions: RecipeStep[]
  portions: number
  prepTimeMinutes: number
  cookTimeMinutes: number
  ingredients: RecipeIngredient[]
  /** Freeform user-defined tags (e.g. "quick", "spicy"). */
  tags: string[]
  skillLevel: SkillLevel
  cuisineTypes: string[]
  dietaryTags: DietaryTag[]
  seasonalTags: SeasonalTag[]
  mealTags: MealTag[]
  equipment: string[]
  /** Manually specified nutrition per serving. When absent, nutrition is calculated from ingredients. */
  nutrition?: NutritionalValues
  /** Estimated cost in local currency per full batch. */
  costEstimate?: number
  notes?: string
  /** Attribution for where this recipe came from. */
  source?: RecipeSource
  isFavorite: boolean
  /** URL to a cover/hero image for this recipe. */
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

/** Fields required to create a new recipe (id and timestamps are server-assigned). */
export type CreateRecipePayload = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>

/** Fields that can be updated on an existing recipe. */
export type UpdateRecipePayload = Partial<CreateRecipePayload>

/** Filters used when querying the recipe list. */
export interface RecipeFilters {
  search?: string
  dietaryTags?: DietaryTag[]
  mealTags?: MealTag[]
  skillLevel?: SkillLevel
  maxPrepTimeMinutes?: number
  maxCookTimeMinutes?: number
  favoritesOnly?: boolean
  tags?: string[]
}
