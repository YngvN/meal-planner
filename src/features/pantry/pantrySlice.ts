import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as pantryApi from './pantryApi'
import type { PantryItem, UpdatePantryItemPayload } from './types'

interface PantryState {
  items: PantryItem[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: PantryState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchPantry = createAsyncThunk('pantry/fetchAll', () => pantryApi.fetchPantry())

export const updatePantryItem = createAsyncThunk(
  'pantry/updateItem',
  ({
    ingredientId,
    payload,
    id,
    productId,
  }: {
    ingredientId: string
    payload: UpdatePantryItemPayload
    id?: string
    productId?: string
  }) => pantryApi.updatePantryItem(ingredientId, payload, id, productId),
)

export const bulkUpdatePantry = createAsyncThunk(
  'pantry/bulkUpdate',
  (updates: Array<{ ingredientId: string; id?: string; productId?: string } & UpdatePantryItemPayload>) =>
    pantryApi.bulkUpdatePantry(updates),
)

const pantrySlice = createSlice({
  name: 'pantry',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPantry.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchPantry.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchPantry.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load pantry'
      })

    builder
      .addCase(updatePantryItem.fulfilled, (state, action) => {
        // Match by surrogate id if available, otherwise by ingredientId+productId combo.
        const item = action.payload
        const idx = state.items.findIndex((p) =>
          p.id === item.id ||
          (p.ingredientId === item.ingredientId && p.productId === item.productId),
        )
        if (idx !== -1) {
          state.items[idx] = item
        } else {
          state.items.push(item)
        }
      })
      .addCase(updatePantryItem.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update pantry item'
      })

    builder
      .addCase(bulkUpdatePantry.fulfilled, (state, action) => {
        if (!Array.isArray(action.payload)) return
        // Merge returned items back into state
        for (const item of action.payload) {
          const idx = state.items.findIndex((p) =>
            p.id === item.id ||
            (p.ingredientId === item.ingredientId && p.productId === item.productId),
          )
          if (idx !== -1) {
            state.items[idx] = item
          } else {
            state.items.push(item)
          }
        }
      })
      .addCase(bulkUpdatePantry.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update pantry'
      })
  },
})

export default pantrySlice.reducer
