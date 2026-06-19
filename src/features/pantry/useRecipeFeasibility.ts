import { useMemo } from 'react'
import { useAppSelector } from '../../app/hooks'
import type { RecipeIngredient } from '../recipes/types'

/**
 * A group of ingredient IDs where the recipe can be satisfied by any one of them.
 * The primary ingredient is `ids[0]`; the rest are alternatives.
 */
export interface IngredientGroup {
  ids: string[]
  /** Display name of the primary ingredient (for missing-ingredient lists). */
  name: string
}

export interface FeasibilityResult {
  /** True when every ingredient group has at least one member in stock. */
  canMake: boolean
  /** Number of groups that have no in-stock member. */
  missingCount: number
  /** The groups the user is missing. */
  missingGroups: IngredientGroup[]
  /** 0–1 ratio of groups that are satisfied. */
  matchRatio: number
}

/**
 * Checks whether a recipe can be made from the current pantry.
 *
 * Accepts recipe ingredients already resolved to IDs (the normal post-save case).
 * Groups primary + alternative rows together so that having ANY member of the
 * group in stock counts as satisfied.
 */
export function useRecipeFeasibility(
  recipeIngredients: RecipeIngredient[],
): FeasibilityResult {
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const ingredientLibrary = useAppSelector((s) => s.ingredients.items)

  return useMemo(() => {
    const inStockIds = new Set(
      pantryItems.filter((p) => p.inStock).map((p) => p.ingredientId),
    )

    // Build a name lookup.
    const nameById = new Map(ingredientLibrary.map((i) => [i.id, i.name]))

    // Group primaries with their alternatives.
    // Primaries = rows where alternativeFor is undefined.
    // We use the row's own ID as the group key during display; for draft rows
    // (alternativeFor is a "draft-N" string) primaries come first in the array
    // so we can iterate in order.
    const groups: IngredientGroup[] = []
    const primaryIdxById = new Map<string, number>()

    for (const ri of recipeIngredients) {
      if (!ri.alternativeFor) {
        // Primary row
        const groupIdx = groups.length
        primaryIdxById.set(ri.ingredientId, groupIdx)
        groups.push({ ids: [ri.ingredientId], name: nameById.get(ri.ingredientId) ?? ri.ingredientId })
      } else {
        // Alternative: find the primary group and append
        // alternativeFor can be a real UUID or "draft-N" temp key
        const primaryGroup = groups.find((g) => g.ids[0] === ri.alternativeFor)
          ?? groups[primaryIdxById.get(ri.alternativeFor ?? '') ?? -1]
        if (primaryGroup) {
          primaryGroup.ids.push(ri.ingredientId)
        }
      }
    }

    const missingGroups = groups.filter(
      (g) => !g.ids.some((id) => inStockIds.has(id)),
    )

    return {
      canMake: missingGroups.length === 0,
      missingCount: missingGroups.length,
      missingGroups,
      matchRatio: groups.length === 0 ? 1 : (groups.length - missingGroups.length) / groups.length,
    }
  }, [recipeIngredients, pantryItems, ingredientLibrary])
}

/**
 * Name-based feasibility check used in the scan flow before ingredient IDs
 * are resolved. Matches draft ingredient names against the pantry by
 * case-insensitive ingredient name lookup.
 */
export function useNameFeasibility(ingredientNames: string[]): {
  inStockCount: number
  total: number
  missingNames: string[]
} {
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const ingredientLibrary = useAppSelector((s) => s.ingredients.items)

  return useMemo(() => {
    const inStockIds = new Set(
      pantryItems.filter((p) => p.inStock).map((p) => p.ingredientId),
    )

    const missingNames: string[] = []
    let inStockCount = 0

    for (const name of ingredientNames) {
      const lower = name.toLowerCase()
      const match = ingredientLibrary.find((i) => i.name.toLowerCase() === lower)
      if (match && inStockIds.has(match.id)) {
        inStockCount++
      } else {
        missingNames.push(name)
      }
    }

    return { inStockCount, total: ingredientNames.length, missingNames }
  }, [ingredientNames, pantryItems, ingredientLibrary])
}
