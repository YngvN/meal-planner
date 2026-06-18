import type { Recipe } from '../../recipes/types'
import type { ScoringFactors } from '../../settings/types'
import type { MealSlot } from '../types'

/** Number of days considered "recent" for the recency penalty tiers. */
const RECENT_HARD = 7
const RECENT_SOFT = 14

/** Weights assigned to each scoring factor (must sum to 1). */
const FACTOR_WEIGHTS: Record<keyof ScoringFactors, number> = {
  pantryMatch: 0.30,
  leftoverIngredients: 0.20,
  prioritizeExpiring: 0.15,
  avoidRepetition: 0.15,
  recencyPenalty: 0.10,
  favoriteBoost: 0.05,
  slotAffinity: 0.05,
}

interface ScoreArgs {
  recipe: Recipe
  slot: MealSlot
  factors: ScoringFactors
  /** IDs of pantry items currently marked in-stock. */
  pantryInStockIds: Set<string>
  /** IDs of pantry items expiring within EXPIRY_WINDOW_DAYS days. */
  expiringIds: Set<string>
  /** IDs of all ingredients used by any planned meal in the target week. */
  weekIngredientIds: Set<string>
  /** Recipe IDs already assigned to any slot in the target week. */
  weekRecipeIds: string[]
  /** Total times this recipe appears in the full meal plan history. */
  usageCount: number
  /** ISO date of the most recent planned meal for this recipe, or null. */
  lastUsedDate: string | null
}

/**
 * Returns a 0–1 score for a recipe for a given slot.
 * Disabled factors are excluded and the remaining weights are re-normalised.
 */
export function scoreRecipe(args: ScoreArgs): number {
  const {
    recipe,
    slot,
    factors,
    pantryInStockIds,
    expiringIds,
    weekIngredientIds,
    weekRecipeIds,
    lastUsedDate,
  } = args

  const ingIds = recipe.ingredients.map((i) => i.ingredientId)
  const total = ingIds.length || 1 // avoid /0

  /** Individual factor scores (0–1 each). */
  const scores: Record<keyof ScoringFactors, number> = {
    pantryMatch:
      ingIds.filter((id) => pantryInStockIds.has(id)).length / total,

    leftoverIngredients:
      ingIds.filter((id) => weekIngredientIds.has(id)).length / total,

    prioritizeExpiring:
      Math.min(ingIds.filter((id) => expiringIds.has(id)).length / total, 1),

    avoidRepetition: Math.max(
      0,
      1 - 0.5 * weekRecipeIds.filter((id) => id === recipe.id).length,
    ),

    recencyPenalty: (() => {
      if (!lastUsedDate) return 1
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diff =
        (today.getTime() - new Date(lastUsedDate + 'T00:00:00').getTime()) /
        (1000 * 60 * 60 * 24)
      if (diff < RECENT_HARD) return 0.2
      if (diff < RECENT_SOFT) return 0.6
      return 1
    })(),

    favoriteBoost: recipe.isFavorite ? 1 : 0.6,

    slotAffinity: recipe.mealTags.includes(slot as Recipe['mealTags'][number])
      ? 1
      : 0.5,
  }

  // Sum only enabled factors; re-normalise weights so total stays 1
  const enabledKeys = (Object.keys(factors) as (keyof ScoringFactors)[]).filter(
    (k) => factors[k],
  )
  const totalWeight = enabledKeys.reduce((sum, k) => sum + FACTOR_WEIGHTS[k], 0)
  if (totalWeight === 0) return 0

  return enabledKeys.reduce(
    (sum, k) => sum + (scores[k] * FACTOR_WEIGHTS[k]) / totalWeight,
    0,
  )
}

/** Extended args for suggestForSlot — passes usage maps instead of per-recipe values. */
type SuggestArgs = Omit<ScoreArgs, 'recipe' | 'slot' | 'usageCount' | 'lastUsedDate'> & {
  usageCounts: Map<string, number>
  lastUsedDates: Map<string, string>
}

/**
 * Returns the best recipe suggestion for a given slot, or null if no suitable
 * recipe can be found. Resolves per-recipe usageCount / lastUsedDate from maps.
 */
export function suggestForSlot(
  slot: MealSlot,
  recipes: Recipe[],
  args: SuggestArgs,
): Recipe | null {
  const { usageCounts, lastUsedDates, ...rest } = args
  let best: Recipe | null = null
  let bestScore = -1

  for (const recipe of recipes) {
    const score = scoreRecipe({
      ...rest,
      recipe,
      slot,
      usageCount: usageCounts.get(recipe.id) ?? 0,
      lastUsedDate: lastUsedDates.get(recipe.id) ?? null,
    })
    if (score > bestScore) {
      bestScore = score
      best = recipe
    }
  }

  return best
}
