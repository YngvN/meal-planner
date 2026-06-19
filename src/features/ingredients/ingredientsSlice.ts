import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as ingredientsApi from './ingredientsApi'
import * as productsApi from './productsApi'
import type {
  CreateIngredientPayload,
  CreateProductPayload,
  Ingredient,
  UpdateIngredientPayload,
  UpdateProductPayload,
} from './types'

interface IngredientsState {
  items: Ingredient[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: IngredientsState = {
  items: [],
  status: 'idle',
  error: null,
}

// ─── Ingredient thunks ────────────────────────────────────────────────────────

export const fetchIngredients = createAsyncThunk('ingredients/fetchAll', () =>
  ingredientsApi.fetchIngredients(),
)

export const createIngredient = createAsyncThunk(
  'ingredients/create',
  (payload: CreateIngredientPayload) => ingredientsApi.createIngredient(payload),
)

export const updateIngredient = createAsyncThunk(
  'ingredients/update',
  ({ id, payload }: { id: string; payload: UpdateIngredientPayload }) =>
    ingredientsApi.updateIngredient(id, payload),
)

export const deleteIngredient = createAsyncThunk('ingredients/delete', (id: string) =>
  ingredientsApi.deleteIngredient(id),
)

// ─── Product thunks ───────────────────────────────────────────────────────────

export const createProduct = createAsyncThunk(
  'ingredients/createProduct',
  (payload: CreateProductPayload) => productsApi.createProduct(payload),
)

export const updateProduct = createAsyncThunk(
  'ingredients/updateProduct',
  ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
    productsApi.updateProduct(id, payload),
)

export const deleteProduct = createAsyncThunk(
  'ingredients/deleteProduct',
  ({ id, ingredientId }: { id: string; ingredientId: string }) => {
    void ingredientId // retained for reducer access via meta.arg
    return productsApi.deleteProduct(id)
  },
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const ingredientsSlice = createSlice({
  name: 'ingredients',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // ── Fetch ──
    builder
      .addCase(fetchIngredients.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchIngredients.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchIngredients.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load ingredients'
      })

    // ── Create ingredient ──
    builder
      .addCase(createIngredient.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(createIngredient.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to create ingredient'
      })

    // ── Update ingredient ──
    builder
      .addCase(updateIngredient.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(updateIngredient.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update ingredient'
      })

    // ── Delete ingredient ──
    builder
      .addCase(deleteIngredient.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.meta.arg)
      })
      .addCase(deleteIngredient.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to delete ingredient'
      })

    // ── Create product ──
    builder.addCase(createProduct.fulfilled, (state, action) => {
      const ingredient = state.items.find((i) => i.id === action.payload.ingredientId)
      if (ingredient) {
        ingredient.products = [...(ingredient.products ?? []), action.payload]
      }
    })

    // ── Update product ──
    builder.addCase(updateProduct.fulfilled, (state, action) => {
      const ingredient = state.items.find((i) => i.id === action.payload.ingredientId)
      if (ingredient?.products) {
        const idx = ingredient.products.findIndex((p) => p.id === action.payload.id)
        if (idx !== -1) ingredient.products[idx] = action.payload
      }
    })

    // ── Delete product ──
    builder.addCase(deleteProduct.fulfilled, (state, action) => {
      const { id, ingredientId } = action.meta.arg
      const ingredient = state.items.find((i) => i.id === ingredientId)
      if (ingredient?.products) {
        ingredient.products = ingredient.products.filter((p) => p.id !== id)
      }
    })
  },
})

export default ingredientsSlice.reducer
