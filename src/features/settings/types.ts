import type { MealSlot } from '../mealPlan/types'

/** Which scoring factors are active when auto-suggesting meals. */
export interface ScoringFactors {
  /** Boost recipes where most ingredients are already in the pantry. */
  pantryMatch: boolean
  /** Boost recipes that use ingredients already opened/used this week. */
  leftoverIngredients: boolean
  /** Boost recipes that use ingredients expiring within 5 days. */
  prioritizeExpiring: boolean
  /** Penalise recipes already planned elsewhere in the same week. */
  avoidRepetition: boolean
  /** Penalise recipes used in the last 14 days. */
  recencyPenalty: boolean
  /** Small boost for recipes the user has favourited. */
  favoriteBoost: boolean
  /** Boost recipes whose mealTags match the target slot. */
  slotAffinity: boolean
}

/** Application-wide user settings. */
export interface Settings {
  mealPlanner: {
    /** Meal slots displayed in the weekly calendar. Default: all four. */
    visibleSlots: MealSlot[]
    /** When true, empty future slots show a scored recipe suggestion. */
    autoSuggestEnabled: boolean
    /** Which scoring factors contribute to the suggestion score. */
    scoringFactors: ScoringFactors
  }
}
