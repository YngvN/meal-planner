import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import ingredientsReducer from '../features/ingredients/ingredientsSlice'
import pantryReducer from '../features/pantry/pantrySlice'
import recipesReducer from '../features/recipes/recipesSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    recipes: recipesReducer,
    ingredients: ingredientsReducer,
    pantry: pantryReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
