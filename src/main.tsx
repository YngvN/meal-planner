import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import { store } from './app/store'
import { LanguageProvider } from './i18n'
import { Components } from './pages/Components'
import { Home } from './pages/Home'
import { Ingredients } from './pages/Ingredients'
import { Pantry } from './pages/Pantry'
import { Profile } from './pages/Profile'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeFormPage } from './pages/RecipeFormPage'
import { Recipes } from './pages/Recipes'
import './styles/global.scss'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'recipes', element: <Recipes /> },
      { path: 'recipes/new', element: <RecipeFormPage /> },
      { path: 'recipes/:id', element: <RecipeDetailPage /> },
      { path: 'recipes/:id/edit', element: <RecipeFormPage /> },
      { path: 'ingredients', element: <Ingredients /> },
      { path: 'pantry', element: <Pantry /> },
      { path: 'profile', element: <Profile /> },
      { path: 'components', element: <Components /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <LanguageProvider>
        <RouterProvider router={router} />
      </LanguageProvider>
    </Provider>
  </StrictMode>,
)
