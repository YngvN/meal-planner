import type { PantryItem } from '../features/pantry/types'

/**
 * 20 pantry items for local development.
 * Covers a mix of fully-stocked, low-stock, and items with expiry dates.
 * These ingredient IDs correspond to mockIngredients.ts.
 */
export const mockPantry: PantryItem[] = [
  // Staples — always stocked
  { ingredientId: 'ing-20', inStock: true, quantity: 500, unit: 'ml', isLow: false },
  { ingredientId: 'ing-25', inStock: true, quantity: 400, unit: 'g', isLow: false },
  { ingredientId: 'ing-26', inStock: true, quantity: 80, unit: 'g', isLow: false },
  { ingredientId: 'ing-27', inStock: true, quantity: 30, unit: 'g', isLow: false },
  { ingredientId: 'ing-21', inStock: true, quantity: 500, unit: 'g', isLow: false },
  { ingredientId: 'ing-28', inStock: true, quantity: 1000, unit: 'g', isLow: false },
  { ingredientId: 'ing-30', inStock: true, quantity: 300, unit: 'ml', isLow: false },

  // Running low
  { ingredientId: 'ing-11', inStock: true, quantity: 50, unit: 'g', isLow: true },
  { ingredientId: 'ing-1', inStock: true, quantity: 2, unit: 'cloves', isLow: true },
  { ingredientId: 'ing-22', inStock: true, quantity: 400, unit: 'g', isLow: false },
  { ingredientId: 'ing-23', inStock: true, quantity: 500, unit: 'ml', isLow: false },

  // Perishables with expiry
  {
    ingredientId: 'ing-16',
    inStock: true,
    quantity: 500,
    unit: 'g',
    isLow: false,
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    ingredientId: 'ing-4',
    inStock: true,
    quantity: 100,
    unit: 'g',
    isLow: false,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    ingredientId: 'ing-12',
    inStock: true,
    quantity: 200,
    unit: 'ml',
    isLow: false,
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    ingredientId: 'ing-15',
    inStock: true,
    quantity: 150,
    unit: 'g',
    isLow: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // In stock, tracked
  { ingredientId: 'ing-2', inStock: true, quantity: 3, unit: 'large', isLow: false },
  { ingredientId: 'ing-8', inStock: true, quantity: 4, unit: 'medium', isLow: false },
  { ingredientId: 'ing-6', inStock: true, quantity: 2, unit: 'large', isLow: false },

  // Out of stock
  { ingredientId: 'ing-19', inStock: false, isLow: false },
  { ingredientId: 'ing-14', inStock: false, isLow: false },
]
