import type { PlannedMeal } from '../features/mealPlan/types'

/**
 * Sample meal plan seeded around 2026-06-18 (today) for local development.
 * Covers the current week (Mon Jun 15 – Sun Jun 21) and two days of the next week.
 */
export const mockMealPlan: PlannedMeal[] = [
  // Current week
  { id: 'mp-1', date: '2026-06-15', slot: 'dinner',    recipeId: 'rec-3' },
  { id: 'mp-2', date: '2026-06-16', slot: 'lunch',     recipeId: 'rec-6' },
  { id: 'mp-3', date: '2026-06-16', slot: 'dinner',    recipeId: 'rec-1' },
  { id: 'mp-4', date: '2026-06-17', slot: 'breakfast', recipeId: 'rec-8' },
  { id: 'mp-5', date: '2026-06-17', slot: 'dinner',    recipeId: 'rec-4' },
  // Today (2026-06-18, Thursday)
  { id: 'mp-6', date: '2026-06-18', slot: 'lunch',     recipeId: 'rec-2' },
  { id: 'mp-7', date: '2026-06-18', slot: 'dinner',    recipeId: 'rec-5' },
  // Upcoming
  { id: 'mp-8', date: '2026-06-19', slot: 'dinner',    recipeId: 'rec-7' },
  { id: 'mp-9', date: '2026-06-20', slot: 'lunch',     recipeId: 'rec-9' },
  { id: 'mp-10', date: '2026-06-20', slot: 'dinner',   recipeId: 'rec-10' },
  { id: 'mp-11', date: '2026-06-21', slot: 'dinner',   recipeId: 'rec-1' },
  // Next week
  { id: 'mp-12', date: '2026-06-22', slot: 'dinner',   recipeId: 'rec-3' },
  { id: 'mp-13', date: '2026-06-23', slot: 'lunch',    recipeId: 'rec-6' },
  { id: 'mp-14', date: '2026-06-23', slot: 'dinner',   recipeId: 'rec-2' },
]
