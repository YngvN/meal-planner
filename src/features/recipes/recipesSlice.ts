import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as recipesApi from './recipesApi'
import type { CreateRecipePayload, Recipe, UpdateRecipePayload } from './types'

interface RecipesState {
  items: Recipe[]
  selectedRecipe: Recipe | null
  status: 'idle' | 'loading' | 'failed'
  error: string | null
}

const initialState: RecipesState = {
  items: [],
  selectedRecipe: null,
  status: 'idle',
  error: null,
}

export const fetchRecipes = createAsyncThunk('recipes/fetchAll', () => recipesApi.fetchRecipes())

export const fetchRecipeById = createAsyncThunk('recipes/fetchById', (id: string) =>
  recipesApi.fetchRecipeById(id),
)

export const createRecipe = createAsyncThunk('recipes/create', (payload: CreateRecipePayload) =>
  recipesApi.createRecipe(payload),
)

export const updateRecipe = createAsyncThunk(
  'recipes/update',
  ({ id, payload }: { id: string; payload: UpdateRecipePayload }) => recipesApi.updateRecipe(id, payload),
)

export const deleteRecipe = createAsyncThunk('recipes/delete', (id: string) => recipesApi.deleteRecipe(id))

export const toggleFavorite = createAsyncThunk('recipes/toggleFavorite', (id: string) =>
  recipesApi.toggleFavorite(id),
)

const recipesSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    clearSelectedRecipe(state) {
      state.selectedRecipe = null
    },
  },
  extraReducers: (builder) => {
    // fetchAll
    builder
      .addCase(fetchRecipes.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchRecipes.fulfilled, (state, action) => {
        state.status = 'idle'
        state.items = action.payload
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load recipes'
      })

    // fetchById
    builder
      .addCase(fetchRecipeById.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchRecipeById.fulfilled, (state, action) => {
        state.status = 'idle'
        state.selectedRecipe = action.payload
        // Also update in items list if present
        const idx = state.items.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(fetchRecipeById.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load recipe'
      })

    // create
    builder
      .addCase(createRecipe.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(createRecipe.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to create recipe'
      })

    // update
    builder
      .addCase(updateRecipe.fulfilled, (state, action) => {
        const idx = state.items.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
        if (state.selectedRecipe?.id === action.payload.id) {
          state.selectedRecipe = action.payload
        }
      })
      .addCase(updateRecipe.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update recipe'
      })

    // delete
    builder
      .addCase(deleteRecipe.fulfilled, (state, action) => {
        state.items = state.items.filter((r) => r.id !== action.meta.arg)
        if (state.selectedRecipe?.id === action.meta.arg) state.selectedRecipe = null
      })
      .addCase(deleteRecipe.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to delete recipe'
      })

    // toggleFavorite
    builder.addCase(toggleFavorite.fulfilled, (state, action) => {
      const idx = state.items.findIndex((r) => r.id === action.payload.id)
      if (idx !== -1) state.items[idx] = action.payload
      if (state.selectedRecipe?.id === action.payload.id) {
        state.selectedRecipe = action.payload
      }
    })
  },
})

export const { clearSelectedRecipe } = recipesSlice.actions
export default recipesSlice.reducer
