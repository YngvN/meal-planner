/** Meal slot within a day. */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** Ordered slot values for sorting (earlier in day = lower index). */
export const MEAL_SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']

/**
 * A single recipe assigned to a specific date and meal slot.
 */
export interface PlannedMeal {
  id: string
  /** ISO date string — "YYYY-MM-DD". */
  date: string
  slot: MealSlot
  recipeId: string
  /** Overrides the recipe's default portion count when set. */
  portions?: number
}

export type CreatePlannedMealPayload = Omit<PlannedMeal, 'id'>
export type UpdatePlannedMealPayload = Partial<Omit<PlannedMeal, 'id'>>
