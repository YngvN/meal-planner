[![Netlify Status](https://api.netlify.com/api/v1/badges/4bd675a0-035f-4080-aaf4-966fcab2b79a/deploy-status)](https://app.netlify.com/projects/hungri/deploys)

# Meal Planner

A personal meal planning application built with Vite + React + TypeScript. Plan your week, browse recipes, track your pantry, and generate shopping lists automatically.

Live: **[hungri.netlify.app](https://hungri.netlify.app)**

## Features

### Recipes
- Create and browse recipes with ingredients, instructions, prep/cook times, skill level, cuisine tags, dietary tags, source attribution, nutritional values, and a cover image.
- **AI recipe scanning** — point your camera at a recipe (cookbook page, recipe card, handwritten note). Supports up to 6 photos for multi-page recipes; all images are sent to Claude in one request so it combines information across pages. The form is pre-filled and marked with an "AI-generated — please review" notice.
- Mark recipes as favourites, filter by dietary tag, meal type, skill level, and more.
- AI translation — translate recipe titles, descriptions, instructions, and notes into other languages (admin only).

### Ingredients & Products
- A global ingredient library organised by category (produce, dairy, meat, …).
- Each ingredient can have specific **branded products** linked to it — e.g. "Mutti Polpa" under "Canned Tomatoes".
- **Barcode scanning** — point the camera at a product barcode. The barcode is automatically detected (no button press) and looked up in Open Food Facts to pre-fill the product name, brand, and nutrition. Lookup results are cached per session.
- **AI front-of-package scan** — photograph the front of a product to extract name and brand via Claude vision.
- **AI nutrition scan** — photograph a nutrition label to extract per-100g values automatically.

### Pantry
- Track stock level (in-stock / low / out-of-stock), quantity, unit, and expiry date per ingredient or specific product.
- **Scan to add** — scan a product barcode directly from the Pantry page to mark it in-stock in one tap.
- Expiry dates auto-populate from each ingredient's default shelf life when you mark something in-stock.
- +/− buttons for quick quantity adjustment.

### Meal planner
- Weekly calendar (Mon–Sun) where you assign recipes to date + meal slot (breakfast, lunch, dinner, snack).
- Navigate between weeks, add meals via a recipe picker, and remove meals with one tap.
- **Auto-suggest** — scores recipes for each empty slot based on pantry match, expiring ingredients, variety, recency, favourites, and slot type. Enable/disable individual factors in Settings.

### Shopping list
- Auto-generated from your meal plan; quantities aggregated and scaled to portion count.
- Ingredients already in-stock are excluded automatically.
- Grouped by store section. Check off items as you shop — purchased items are marked in-stock in your pantry.
- Add extra items manually.

### Home dashboard
- Next planned meal, what you can make right now, ingredients expiring within 7 days, and a "things to do" list of items with missing nutrition, shelf life, or image data.

### User accounts
- **Supabase Auth** — sign up with username + email + password; invite codes can be required.
- **Roles** — `admin` and `user`. First account to register becomes admin automatically.
- Recipes and ingredients can be **global** (visible to all) or **private** (only your own).
- Pantry and meal plan are per-user.
- Global recipes show the creator's username as attribution.

### Admin
- Dedicated `/admin` page (sidebar link visible to admins only).
- Control max users, invite-code requirement, and the per-user AI image scan quota.
- Generate and revoke invite codes.
- Promote / demote users between admin and user roles.
- **AI usage statistics** — per-user scan count vs. quota with a progress bar; over-quota shown in red.

### UX
- Responsive left sidebar nav — persistent on desktop, hamburger-toggled on mobile.
- Light / dark theme — follows OS preference, toggleable in Settings.
- Internationalization (i18n) — English and Norwegian included; easy to extend by adding a new entry to `languages.json`.
- Mock data layer — set `VITE_USE_MOCK_DATA=true` to run fully without a backend (uses in-memory seed data).

---

## Tech stack

- **[Vite](https://vitejs.dev/)** — dev server and build tooling.
- **[React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)** — UI and type safety.
- **[react-router-dom](https://reactrouter.com/)** — client-side routing.
- **[Redux Toolkit](https://redux-toolkit.js.org/) + [react-redux](https://react-redux.js.org/)** — global state (`recipes`, `ingredients`, `pantry`, `mealPlan`, `shoppingList`, `auth`, `admin`, `settings` slices).
- **[@supabase/supabase-js](https://supabase.com/docs/reference/javascript)** — database client (PostgREST queries, Supabase Auth, RLS-enforced multi-user isolation).
- **[Sass](https://sass-lang.com/)** — component styling with light/dark theme variables.
- **[lucide-react](https://lucide.dev/)** — SVG icon set (tree-shaken, inherits theme colour via `currentColor`).
- **[@zxing/browser](https://github.com/zxing-js/library) + [@zxing/library](https://github.com/zxing-js/library)** — cross-browser barcode detection (EAN-13, UPC-A, QR, etc.) via live camera feed.
- **[@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript)** — Claude API client, used **server-side only** inside Netlify Functions (`netlify/functions/ai-*`). The API key is never exposed to the client.
- **[@netlify/functions](https://docs.netlify.com/functions/overview/)** — serverless function types.
- **[ESLint](https://eslint.org/)** — linting.

---

## Getting started

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build
npm run lint     # run eslint
```

Copy `.env.example` to `.env.development` and fill in the values:

```
VITE_USE_MOCK_DATA=false
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Supabase Dashboard>
VITE_USE_MOCK_AI=false
```

For the AI features to work in production, set `ANTHROPIC_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` in Netlify → Site configuration → Environment variables (never in committed files).

---

## Project structure

```
netlify/functions/      # Serverless AI endpoints (recipe scan, nutrition scan, translation, …)
supabase/migrations/    # SQL migrations (schema, RLS policies, auth trigger)
src/
  app/                  # Redux store, typed hooks, ProtectedApp route guard
  components/           # Reusable UI components (Button, Modal, BarcodeScanner, …)
  features/             # Domain feature areas — each owns types, slice, API, and components
    ai/                 # AI scan buttons, RecipePhotoScanner, aiApi client
    auth/               # Supabase Auth — authApi, authSlice, AuthProvider
    ingredients/        # Ingredient categories, products, barcode lookup, ProductWizard
    mealPlan/
    pantry/
    recipes/
    settings/           # App preferences + adminApi/adminSlice
    shared/             # Shared types, unit conversion, localization helpers
    shoppingList/
  i18n/                 # Language setup — languages.json (en, no), useLanguage hook
  lib/                  # Clients: supabaseClient, axiosClient, logger
  mocks/                # In-memory mock API and seed data (active when VITE_USE_MOCK_DATA=true)
  pages/                # Route-level views (Home, Recipes, Pantry, Admin, Settings, …)
    auth/               # Login, Signup, ForgotPassword (outside sidebar shell)
  styles/               # Global SCSS, theme tokens, variables
  App.tsx               # App shell — left sidebar nav, sign-out, admin nav item
  main.tsx              # Entry point — providers, route definitions, AuthProvider
```
