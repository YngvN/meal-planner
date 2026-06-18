# Meal Planner — User Stories Checklist

Legend: ✅ Built · 🔨 Planned (next phase) · 💡 Planned (future) · ⬜ Not yet planned

---

## Epic 1: Recipe Management

### Basic Recipe Features
- ✅ Add recipes with title, description, and instructions
- ✅ Add ingredients with quantities to recipes
- ✅ Specify number of portions per recipe
- ✅ Add preparation and cooking time
- ✅ Edit and delete recipes
- ✅ View all recipes in a browseable list

### Recipe Metadata & Tags
- ✅ Add freeform tags (spicy, dessert, quick, etc.)
- ✅ Add skill level (beginner, intermediate, advanced)
- ✅ Add cuisine type tags (Italian, Mexican, Asian, etc.)
- ✅ Add dietary tags (vegetarian, vegan, gluten-free, dairy-free, nut-free)
- ✅ Add seasonal tags (spring, summer, autumn, winter)
- ✅ Specify required equipment
- ✅ Add optional manual nutritional values
- ✅ Add recipe source/attribution (website, book, or person)
- ✅ Add recipe photo / image (imageUrl field)

### Recipe Search & Discovery
- ✅ Search recipes by name
- ✅ Filter by dietary tags
- ✅ Filter by meal type (breakfast, lunch, dinner, snack, dessert)
- ✅ Filter by skill level
- ✅ Mark recipes as favorites / view favorites-only
- ⬜ Filter by preparation time
- ⬜ Filter by equipment available
- ⬜ Filter by cuisine type

### Recipe Enhancement
- ⬜ Scale recipe quantities interactively on the detail view
- ✅ Add personal notes to a recipe
- 💡 Ingredient substitution suggestions
- ⬜ Cost estimation per recipe
- 💡 Import recipe from URL
- ⬜ Export / print recipe (print-friendly view or PDF)
- ⬜ Share recipe with a link
- ⬜ "I made this!" button to log cooking history

---

## Epic 2: Ingredient Management

### Global Ingredient Library
- ✅ Create and manage a global ingredient library
- ✅ Add ingredients with name and category
- ✅ Edit and delete ingredients
- ✅ Add per-100g nutritional values to ingredients
- ✅ Add default shelf life (days) to ingredients
- ✅ Add named subproducts / variants (e.g. Whole Milk, Skimmed Milk)
- ✅ Ingredient photo / image (imageUrl field)
- ⬜ Barcode scanning to identify ingredients

### Pantry / Inventory Tracking
- ✅ Mark ingredients as in-stock / out-of-stock
- ✅ Specify quantities for pantry items
- ✅ Mark ingredients as running low
- ✅ Track expiration dates for perishable items
- ✅ Auto-set expiry from ingredient's default shelf life
- ✅ View complete pantry inventory grouped by category
- ⬜ Reminders / notifications for items expiring within N days
- ⬜ Log when stock was last replenished

### Smart Recipe Matching
- ✅ See what recipes can be made with current pantry
- ✅ See missing ingredients per recipe
- ✅ See recipes close to makeable (sorted by match %)
- ⬜ Filter recipe suggestions by expiring-soon ingredients
- ⬜ "Use up" mode: suggest recipes that primarily use what's expiring

---

## Epic 3: Meal Planning

### Calendar & Scheduling
- 🔨 Weekly meal calendar view
- ⬜ Monthly meal calendar view
- 🔨 Assign recipes to specific dates and meal times
- 🔨 Drag and drop recipes onto calendar days
- 🔨 Remove or reschedule planned meals
- ⬜ Portions planned vs. household size indicator

### Meal Plan Templates
- 💡 Save weekly meal plan as a reusable template
- 💡 Load a saved template
- 💡 Name and organise templates

### Smart Suggestions
- 💡 "What can I make tonight?" — considers pantry, time, and difficulty
- 💡 Recommend recipes not cooked recently (variety)
- 💡 Suggest recipes that use leftover / expiring ingredients

### Household Management
- 💡 Set household size (auto-scales recipes)
- 💡 Family member profiles with dietary restrictions
- 💡 Mark disliked ingredients (recipes flagged or hidden)

---

## Epic 4: Shopping List Management

### Shopping List Generation
- 🔨 Auto-generate shopping list from meal plan
- 🔨 Aggregate quantities across multiple recipes
- 🔨 Exclude ingredients already in pantry
- 🔨 Manually add non-recipe items to shopping list

### Shopping List Organisation
- 🔨 Group shopping list by store section (produce, dairy, etc.)
- 🔨 Show which recipe(s) each item is for
- 💡 Reorder sections to match preferred store layout

### Shopping Mode
- 🔨 Check off items as purchased
- 🔨 Uncheck items if put back
- 🔨 Completed vs. remaining item count
- 🔨 Checked items automatically update pantry inventory

### Shopping List Management
- 🔨 Manually remove items
- 🔨 Edit quantities on the list
- 🔨 Clear entire list after shopping
- 💡 Save past shopping lists for reference

---

## Epic 5: Cooking Mode & Execution

### Active Cooking
- ✅ Step-by-step recipe instructions
- ✅ Per-step timers (shown in recipe detail)
- 💡 Interactive cooking mode: mark steps complete, running countdown timers
- 💡 View ingredients scaled to current portion size in cooking mode
- ⬜ "Cooked this!" — log that the recipe was made (powers usage insights + variety suggestions)

---

## Epic 6: Reporting & Insights

### Nutritional Tracking
- ✅ Manual nutritional values per recipe
- ✅ Calculated nutrition from ingredient data
- 💡 Weekly nutrition totals from meal plan
- ⬜ Daily calorie / macro targets and progress

### Cost Tracking
- ⬜ Cost estimation per recipe
- ⬜ Weekly grocery cost from meal plan
- ⬜ Price tracking per ingredient over time
- ⬜ Budget alerts

### Usage Insights
- 💡 Most-cooked recipes
- 💡 Recipes not made recently
- 💡 Most-used ingredients

---

## Epic 7: User Settings & Preferences

### Dietary Preferences
- 💡 Global dietary restrictions (auto-filter recipes)
- 💡 Allergen list (warnings on recipes)
- 💡 Disliked ingredients list

### System Preferences
- ⬜ Default portion size
- ⬜ Measurement system (metric / imperial)
- ⬜ Customise store sections for shopping list
- ⬜ Notification preferences (expiry reminders, etc.)

---

## Epic 8: UX & Platform (not in original stories)

These are gaps identified during development that are worth tracking:

- ✅ Add Recipe via modal (not full-page navigation)
- ✅ Add Ingredient via modal
- ✅ Home page as a dashboard (what can I make + expiring items + things to do)
- ✅ Meal Planner and Shopping List nav links
- ✅ Recipe image (imageUrl field, shown as card thumbnail + detail hero)
- ✅ Ingredient image (imageUrl field, shown in list + combobox)
- ✅ Ingredient search combobox with create-on-enter in recipe form
- ✅ "Things to do" dashboard widget for incomplete ingredient data
- ⬜ Interactive portion scaling widget on recipe detail page
- ⬜ Allergen warning badges on recipe cards and in recipe detail
- ⬜ Barcode scanner for adding pantry items while shopping
- ⬜ Offline mode / PWA support (works without internet)
- ⬜ Export recipe as printable PDF
- ⬜ Share recipe via link or QR code
- ⬜ Collaborative recipe collection (share with family members)
- ⬜ Recipe version history / changelog
- ⬜ "Cooked this!" history log to power variety suggestions
- ⬜ Keyboard shortcuts for power users
- ⬜ Keyboard-accessible drag-and-drop for meal plan calendar
- ⬜ Multiple grocery stores with per-store prices
- ⬜ Take picture of a product and its nutritional value, and automatically add to text fields


