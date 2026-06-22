import { configureStore } from '@reduxjs/toolkit'
import AsyncStorage from '@react-native-async-storage/async-storage'
import adminReducer from '../features/settings/adminSlice'
import authReducer from '../features/auth/authSlice'
import ingredientsReducer from '../features/ingredients/ingredientsSlice'
import mealPlanReducer from '../features/mealPlan/mealPlanSlice'
import pantryReducer from '../features/pantry/pantrySlice'
import recipesReducer from '../features/recipes/recipesSlice'
import settingsReducer from '../features/settings/settingsSlice'
import shoppingListReducer from '../features/shoppingList/shoppingListSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    admin: adminReducer,
    recipes: recipesReducer,
    ingredients: ingredientsReducer,
    pantry: pantryReducer,
    mealPlan: mealPlanReducer,
    shoppingList: shoppingListReducer,
    settings: settingsReducer,
  },
})

// Persist settings to AsyncStorage on every state change.
store.subscribe(() => {
  const { settings } = store.getState()
  AsyncStorage.setItem('meal-planner-settings', JSON.stringify(settings)).catch(() => {
    // Ignore write errors (e.g. private browsing quota exceeded).
  })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
