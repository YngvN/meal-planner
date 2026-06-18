/** Difficulty level of a recipe. */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

/** Dietary classifications that can be applied to a recipe. */
export type DietaryTag = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free'

/** Seasons the recipe is best suited for. */
export type SeasonalTag = 'spring' | 'summer' | 'autumn' | 'winter'

/** Which meal occasion the recipe fits. */
export type MealTag = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'

/** One ingredient reference inside a recipe, with quantity and unit. */
export interface RecipeIngredient {
  ingredientId: string
  quantity: number
  unit: string
}

/** A single step in the recipe instructions. */
export interface RecipeStep {
  order: number
  description: string
  /** Optional timer duration in minutes shown during cooking mode. */
  timerMinutes?: number
}

/** Optional nutritional breakdown per serving. */
export interface NutritionalValues {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
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
  nutrition?: NutritionalValues
  /** Estimated cost in local currency per full batch. */
  costEstimate?: number
  notes?: string
  isFavorite: boolean
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
