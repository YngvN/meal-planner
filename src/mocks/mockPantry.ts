import type { PantryItem } from '../features/pantry/types'

/**
 * 20 pantry items for local development.
 * Covers a mix of fully-stocked, low-stock, and items with expiry dates.
 * These ingredient IDs correspond to mockIngredients.ts.
 */
export const mockPantry: PantryItem[] = [
  // Staples — always stocked
  { id: 'p-1', ingredientId: 'ing-20', inStock: true, quantity: 500, unit: 'ml', isLow: false },
  { id: 'p-2', ingredientId: 'ing-25', inStock: true, quantity: 400, unit: 'g', isLow: false },
  { id: 'p-3', ingredientId: 'ing-26', inStock: true, quantity: 80, unit: 'g', isLow: false },
  { id: 'p-4', ingredientId: 'ing-27', inStock: true, quantity: 30, unit: 'g', isLow: false },
  { id: 'p-5', ingredientId: 'ing-21', inStock: true, quantity: 500, unit: 'g', isLow: false },
  { id: 'p-6', ingredientId: 'ing-28', inStock: true, quantity: 1000, unit: 'g', isLow: false },
  { id: 'p-7', ingredientId: 'ing-30', inStock: true, quantity: 300, unit: 'ml', isLow: false },

  // Running low
  { id: 'p-8', ingredientId: 'ing-11', inStock: true, quantity: 50, unit: 'g', isLow: true },
  { id: 'p-9', ingredientId: 'ing-1', inStock: true, quantity: 2, unit: 'cloves', isLow: true },
  { id: 'p-10', ingredientId: 'ing-22', inStock: true, quantity: 400, unit: 'g', isLow: false },
  { id: 'p-11', ingredientId: 'ing-23', inStock: true, quantity: 500, unit: 'ml', isLow: false },

  // Perishables with expiry
  {
    id: 'p-12',
    ingredientId: 'ing-16',
    inStock: true,
    quantity: 500,
    unit: 'g',
    isLow: false,
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p-13',
    ingredientId: 'ing-4',
    inStock: true,
    quantity: 100,
    unit: 'g',
    isLow: false,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p-14',
    ingredientId: 'ing-12',
    inStock: true,
    quantity: 200,
    unit: 'ml',
    isLow: false,
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'p-15',
    ingredientId: 'ing-15',
    inStock: true,
    quantity: 150,
    unit: 'g',
    isLow: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // In stock, tracked
  { id: 'p-16', ingredientId: 'ing-2', inStock: true, quantity: 3, unit: 'large', isLow: false },
  { id: 'p-17', ingredientId: 'ing-8', inStock: true, quantity: 4, unit: 'medium', isLow: false },
  { id: 'p-18', ingredientId: 'ing-6', inStock: true, quantity: 2, unit: 'large', isLow: false },

  // Out of stock
  { id: 'p-19', ingredientId: 'ing-19', inStock: false, isLow: false },
  { id: 'p-20', ingredientId: 'ing-14', inStock: false, isLow: false },
]
