import type { Ingredient } from '../features/ingredients/types'

/** 30 ingredients spanning all categories for local development and testing. */
export const mockIngredients: Ingredient[] = [
  // Produce
  { id: 'ing-1', name: 'Garlic', category: 'produce' },
  { id: 'ing-2', name: 'Yellow Onion', category: 'produce' },
  { id: 'ing-3', name: 'Tomato', category: 'produce' },
  { id: 'ing-4', name: 'Spinach', category: 'produce' },
  { id: 'ing-5', name: 'Broccoli', category: 'produce' },
  { id: 'ing-6', name: 'Bell Pepper', category: 'produce' },
  { id: 'ing-7', name: 'Zucchini', category: 'produce' },
  { id: 'ing-8', name: 'Carrot', category: 'produce' },
  { id: 'ing-9', name: 'Lemon', category: 'produce' },
  { id: 'ing-10', name: 'Fresh Basil', category: 'produce' },

  // Dairy
  { id: 'ing-11', name: 'Butter', category: 'dairy' },
  { id: 'ing-12', name: 'Heavy Cream', category: 'dairy' },
  { id: 'ing-13', name: 'Parmesan Cheese', category: 'dairy' },
  { id: 'ing-14', name: 'Mozzarella', category: 'dairy' },
  { id: 'ing-15', name: 'Greek Yogurt', category: 'dairy' },

  // Meat
  { id: 'ing-16', name: 'Chicken Breast', category: 'meat' },
  { id: 'ing-17', name: 'Ground Beef', category: 'meat' },
  { id: 'ing-18', name: 'Bacon', category: 'meat' },
  { id: 'ing-19', name: 'Salmon Fillet', category: 'seafood' },

  // Pantry
  { id: 'ing-20', name: 'Olive Oil', category: 'pantry' },
  { id: 'ing-21', name: 'Spaghetti', category: 'pantry' },
  { id: 'ing-22', name: 'Canned Tomatoes', category: 'pantry' },
  { id: 'ing-23', name: 'Chicken Stock', category: 'pantry' },
  { id: 'ing-24', name: 'All-Purpose Flour', category: 'pantry' },
  { id: 'ing-25', name: 'Salt', category: 'pantry' },
  { id: 'ing-26', name: 'Black Pepper', category: 'pantry' },
  { id: 'ing-27', name: 'Dried Oregano', category: 'pantry' },
  { id: 'ing-28', name: 'Basmati Rice', category: 'pantry' },
  { id: 'ing-29', name: 'Coconut Milk', category: 'pantry' },
  { id: 'ing-30', name: 'Soy Sauce', category: 'pantry' },
]
