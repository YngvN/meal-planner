# Meal Planner

A personal meal planning application built with Vite + React + TypeScript. Plan your week, browse recipes, track your pantry, and generate shopping lists automatically.

## Features

- **Recipe library** — create and browse recipes with ingredients, instructions, prep/cook times, skill level, cuisine tags, dietary tags, source attribution, nutritional values, and an optional cover image.
- **Ingredient library** — a global library of ingredients with per-100g nutrition, default shelf life, variants/subproducts, and optional images. A search-as-you-type combobox lets you find or create ingredients inline when editing a recipe.
- **Pantry tracking** — mark ingredients as in-stock, running low, or out-of-stock. Expiry dates are auto-populated from each ingredient's default shelf life when you mark something in-stock.
- **Recipe matcher** — see which recipes you can make with what's in your pantry, sorted by match percentage. Missing ingredients are listed per recipe.
- **Meal planner** — a weekly calendar where you assign recipes to date + meal slot (breakfast, lunch, dinner, snack). Navigate between weeks, add meals from a searchable recipe picker, and remove meals with one tap.
- **Shopping list** — automatically generated from your meal plan. Quantities are aggregated across all planned meals and scaled to your portion count. Items already in-stock in the pantry are excluded. Grouped by store section (produce, dairy, meat, etc.). Check off items as you shop; checking off marks them as purchased and updates your pantry. Add extra items manually.
- **Home dashboard** — at a glance: next planned meal, what you can make with your current pantry, ingredients expiring within 7 days, and a "things to do" list of ingredients with incomplete data (missing nutrition, shelf life, or image).
- **Light / dark theme** — follows OS preference, toggleable in the header, choice persisted.
- **Internationalization (i18n)** — English and Norwegian included, switchable via `LanguageSwitcher`, easy to extend.
- **Mock data layer** — `VITE_USE_MOCK_DATA=true` in `.env.development` activates an in-memory API with sample recipes, ingredients, pantry items, and meal plan entries so the app is fully usable without a backend.

## Tech stack

- **[Vite](https://vitejs.dev/)** — dev server and build tooling.
- **[React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)** — UI and type safety.
- **[react-router-dom](https://reactrouter.com/)** — client-side routing.
- **[Redux Toolkit](https://redux-toolkit.js.org/) + [react-redux](https://react-redux.js.org/)** — global state management (`recipes`, `ingredients`, `pantry`, `mealPlan`, `shoppingList` slices).
- **[Axios](https://axios-http.com/)** — HTTP client (`src/lib/axiosClient.ts`).
- **[Sass](https://sass-lang.com/)** — component styling with light/dark theme variables (`src/styles`).
- **[Framer Motion](https://www.framer.com/motion/)** — animations (e.g. the `TranslatedText` fade transition).
- **[ESLint](https://eslint.org/)** — linting.

## Getting started

```sh
npm install
npm run dev      # start the dev server (mock data active by default)
npm run build    # type-check and build for production
npm run preview  # preview the production build
npm run lint     # run eslint
```

## Project structure

```
public/           # Static files served as-is
src/
  app/            # Redux store and typed hooks
  assets/         # Images/icons that aren't served directly
  components/     # Reusable UI components (Button, Modal, Badge, IngredientCombobox, …)
  features/       # Domain feature areas — each has types, slice, API, and components
    auth/
    ingredients/
    mealPlan/
    pantry/
    recipes/
    shared/       # Shared types (e.g. NutritionalValues)
    shoppingList/
  hooks/          # Custom React hooks
  i18n/           # Language/translation setup (languages.json, useLanguage)
  lib/            # Integration clients (e.g. Axios)
  mocks/          # In-memory mock API and seed data
  pages/          # Route-level views (Home, MealPlan, ShoppingList, …)
  styles/         # Global styles and theme tokens/variables
  App.tsx         # App shell: layout, nav, theme/language controls
  main.tsx        # Entry point: providers and route definitions
```
