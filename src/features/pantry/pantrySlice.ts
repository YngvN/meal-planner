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
  ({ ingredientId, payload }: { ingredientId: string; payload: UpdatePantryItemPayload }) =>
    pantryApi.updatePantryItem(ingredientId, payload),
)

export const bulkUpdatePantry = createAsyncThunk(
  'pantry/bulkUpdate',
  (updates: Array<{ ingredientId: string } & UpdatePantryItemPayload>) =>
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
        const idx = state.items.findIndex((p) => p.ingredientId === action.payload.ingredientId)
        if (idx !== -1) {
          state.items[idx] = action.payload
        } else {
          state.items.push(action.payload)
        }
      })
      .addCase(updatePantryItem.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update pantry item'
      })

    builder
      .addCase(bulkUpdatePantry.fulfilled, (state, action) => {
        state.items = Array.isArray(action.payload) ? action.payload : state.items
      })
      .addCase(bulkUpdatePantry.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update pantry'
      })
  },
})

export default pantrySlice.reducer
