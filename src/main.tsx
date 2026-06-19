import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import { ProtectedApp } from './app/ProtectedApp.tsx'
import { store } from './app/store'
import { AuthProvider } from './features/auth/AuthProvider'
import { LanguageProvider } from './i18n'
import { Admin } from './pages/Admin'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Login } from './pages/auth/Login'
import { Signup } from './pages/auth/Signup'
import { Components } from './pages/Components'
import { Home } from './pages/Home'
import { Ingredients } from './pages/Ingredients'
import { MealPlan } from './pages/MealPlan'
import { Pantry } from './pages/Pantry'
import { Profile } from './pages/Profile'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeFormPage } from './pages/RecipeFormPage'
import { Recipes } from './pages/Recipes'
import { Settings } from './pages/Settings'
import { ShoppingList } from './pages/ShoppingList'
import './styles/global.scss'

const router = createBrowserRouter([
  // ── Public auth routes (no sidebar shell) ──────────────────────────────────
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/forgot-password', element: <ForgotPassword /> },

  // ── Protected app shell (sidebar + nav) ────────────────────────────────────
  {
    path: '/',
    element: (
      <ProtectedApp>
        <App />
      </ProtectedApp>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'recipes', element: <Recipes /> },
      { path: 'recipes/:id', element: <RecipeDetailPage /> },
      { path: 'recipes/:id/edit', element: <RecipeFormPage /> },
      { path: 'ingredients', element: <Ingredients /> },
      { path: 'pantry', element: <Pantry /> },
      { path: 'meal-plan', element: <MealPlan /> },
      { path: 'shopping-list', element: <ShoppingList /> },
      { path: 'settings', element: <Settings /> },
      { path: 'admin', element: <Admin /> },
      { path: 'profile', element: <Profile /> },
      { path: 'components', element: <Components /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <LanguageProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </LanguageProvider>
    </Provider>
  </StrictMode>,
)
