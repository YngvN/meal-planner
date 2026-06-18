import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ManualShoppingItem } from './types'

interface ShoppingListState {
  /**
   * Ingredient IDs that the user has checked off from the derived
   * (meal-plan-generated) shopping list.
   */
  checkedIngredientIds: string[]
  /** Items the user added manually, not tied to any recipe. */
  manualItems: ManualShoppingItem[]
}

const initialState: ShoppingListState = {
  checkedIngredientIds: [],
  manualItems: [],
}

const shoppingListSlice = createSlice({
  name: 'shoppingList',
  initialState,
  reducers: {
    /** Toggle checked state for a derived (recipe-based) ingredient. */
    toggleIngredientChecked(state, action: PayloadAction<string>) {
      const id = action.payload
      const idx = state.checkedIngredientIds.indexOf(id)
      if (idx === -1) {
        state.checkedIngredientIds.push(id)
      } else {
        state.checkedIngredientIds.splice(idx, 1)
      }
    },

    /** Add a manually entered item. */
    addManualItem(state, action: PayloadAction<Omit<ManualShoppingItem, 'id'>>) {
      state.manualItems.push({ ...action.payload, id: `manual-${Date.now()}` })
    },

    /** Toggle checked state for a manual item. */
    toggleManualItemChecked(state, action: PayloadAction<string>) {
      const item = state.manualItems.find((m) => m.id === action.payload)
      if (item) item.checked = !item.checked
    },

    /** Remove a manual item. */
    removeManualItem(state, action: PayloadAction<string>) {
      state.manualItems = state.manualItems.filter((m) => m.id !== action.payload)
    },

    /** Clear all checked ingredient IDs and manual items. */
    clearAll(state) {
      state.checkedIngredientIds = []
      state.manualItems = []
    },

    /** Uncheck all derived ingredients (e.g. after updating pantry). */
    uncheckAll(state) {
      state.checkedIngredientIds = []
    },
  },
})

export const {
  toggleIngredientChecked,
  addManualItem,
  toggleManualItemChecked,
  removeManualItem,
  clearAll,
  uncheckAll,
} = shoppingListSlice.actions

export default shoppingListSlice.reducer
