import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import ingredientsReducer from '../features/ingredients/ingredientsSlice'
import mealPlanReducer from '../features/mealPlan/mealPlanSlice'
import pantryReducer from '../features/pantry/pantrySlice'
import recipesReducer from '../features/recipes/recipesSlice'
import shoppingListReducer from '../features/shoppingList/shoppingListSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    recipes: recipesReducer,
    ingredients: ingredientsReducer,
    pantry: pantryReducer,
    mealPlan: mealPlanReducer,
    shoppingList: shoppingListReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
