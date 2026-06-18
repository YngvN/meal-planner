import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import * as mealPlanApi from './mealPlanApi'
import type { CreatePlannedMealPayload, PlannedMeal, UpdatePlannedMealPayload } from './types'

interface MealPlanState {
  items: PlannedMeal[]
  status: 'idle' | 'loading' | 'failed'
  error: string | null
}

const initialState: MealPlanState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchMealPlan = createAsyncThunk('mealPlan/fetchAll', () => mealPlanApi.fetchMealPlan())

export const addPlannedMeal = createAsyncThunk('mealPlan/add', (payload: CreatePlannedMealPayload) =>
  mealPlanApi.addPlannedMeal(payload),
)

export const updatePlannedMeal = createAsyncThunk(
  'mealPlan/update',
  ({ id, payload }: { id: string; payload: UpdatePlannedMealPayload }) =>
    mealPlanApi.updatePlannedMeal(id, payload),
)

export const removePlannedMeal = createAsyncThunk('mealPlan/remove', (id: string) =>
  mealPlanApi.removePlannedMeal(id),
)

const mealPlanSlice = createSlice({
  name: 'mealPlan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMealPlan.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchMealPlan.fulfilled, (state, action) => {
        state.status = 'idle'
        state.items = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchMealPlan.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load meal plan'
      })

    builder
      .addCase(addPlannedMeal.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(addPlannedMeal.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to add meal'
      })

    builder
      .addCase(updatePlannedMeal.fulfilled, (state, action) => {
        const idx = state.items.findIndex((m) => m.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(updatePlannedMeal.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update meal'
      })

    builder
      .addCase(removePlannedMeal.fulfilled, (state, action) => {
        state.items = state.items.filter((m) => m.id !== action.meta.arg)
      })
      .addCase(removePlannedMeal.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to remove meal'
      })
  },
})

export default mealPlanSlice.reducer
