import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as ingredientsApi from './ingredientsApi'
import type { CreateIngredientPayload, Ingredient, UpdateIngredientPayload } from './types'

interface IngredientsState {
  items: Ingredient[]
  status: 'idle' | 'loading' | 'failed'
  error: string | null
}

const initialState: IngredientsState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchIngredients = createAsyncThunk('ingredients/fetchAll', () =>
  ingredientsApi.fetchIngredients(),
)

export const createIngredient = createAsyncThunk('ingredients/create', (payload: CreateIngredientPayload) =>
  ingredientsApi.createIngredient(payload),
)

export const updateIngredient = createAsyncThunk(
  'ingredients/update',
  ({ id, payload }: { id: string; payload: UpdateIngredientPayload }) =>
    ingredientsApi.updateIngredient(id, payload),
)

export const deleteIngredient = createAsyncThunk('ingredients/delete', (id: string) =>
  ingredientsApi.deleteIngredient(id),
)

const ingredientsSlice = createSlice({
  name: 'ingredients',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIngredients.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchIngredients.fulfilled, (state, action) => {
        state.status = 'idle'
        state.items = action.payload
      })
      .addCase(fetchIngredients.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load ingredients'
      })

    builder
      .addCase(createIngredient.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(createIngredient.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to create ingredient'
      })

    builder
      .addCase(updateIngredient.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(updateIngredient.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update ingredient'
      })

    builder
      .addCase(deleteIngredient.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.meta.arg)
      })
      .addCase(deleteIngredient.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to delete ingredient'
      })
  },
})

export default ingredientsSlice.reducer
