import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import type { IngredientCategory } from '../../ingredients/types'
import type { PantryItem } from '../../pantry/types'
import { updatePantryItem } from '../../pantry/pantrySlice'
import type { PlannedMeal } from '../../mealPlan/types'
import type { Recipe } from '../../recipes/types'
import { useLanguage } from '../../../i18n'
import {
  addManualItem,
  clearAll,
  removeManualItem,
  toggleIngredientChecked,
  toggleManualItemChecked,
  uncheckAll,
} from '../shoppingListSlice'
import type { DerivedShoppingItem } from '../types'
import './ShoppingListView.scss'

/** Category display order for grouping. */
const CATEGORY_ORDER: IngredientCategory[] = [
  'produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'beverages', 'pantry', 'other',
]

/**
 * Aggregates recipe ingredients from all planned meals into a shopping list,
 * accounting for portion scaling and excluding pantry in-stock items.
 */
function buildDerivedItems(
  plannedMeals: PlannedMeal[],
  recipes: Recipe[],
  pantryItems: PantryItem[],
): DerivedShoppingItem[] {
  const agg = new Map<string, DerivedShoppingItem>()

  for (const meal of plannedMeals) {
    const recipe = recipes.find((r) => r.id === meal.recipeId)
    if (!recipe) continue
    const scale = (meal.portions ?? recipe.portions) / recipe.portions

    for (const ri of recipe.ingredients) {
      const pantryItem = pantryItems.find((p) => p.ingredientId === ri.ingredientId)
      if (pantryItem?.inStock) continue

      const key = `${ri.ingredientId}::${ri.unit}`
      const existing = agg.get(key)
      if (existing) {
        existing.quantity += ri.quantity * scale
        if (!existing.recipeIds.includes(recipe.id)) existing.recipeIds.push(recipe.id)
      } else {
        agg.set(key, {
          ingredientId: ri.ingredientId,
          quantity: ri.quantity * scale,
          unit: ri.unit,
          recipeIds: [recipe.id],
        })
      }
    }
  }

  return Array.from(agg.values())
}

/**
 * Full shopping list UI. Derives items from the meal plan, groups by category,
 * lets users check off items (auto-updating pantry), and add manual items.
 */
export function ShoppingListView() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const plannedMeals = useAppSelector((s) => s.mealPlan.items)
  const recipes = useAppSelector((s) => s.recipes.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const checkedIds = useAppSelector((s) => s.shoppingList.checkedIngredientIds)
  const manualItems = useAppSelector((s) => s.shoppingList.manualItems)

  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')

  const ingredientMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  const derived = useMemo(
    () => buildDerivedItems(plannedMeals, recipes, pantryItems),
    [plannedMeals, recipes, pantryItems],
  )

  // Group derived items by ingredient category
  const grouped = useMemo(() => {
    const map = new Map<IngredientCategory, DerivedShoppingItem[]>()
    for (const item of derived) {
      const ing = ingredientMap.get(item.ingredientId)
      const cat: IngredientCategory = ing?.category ?? 'other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    // Return in display order
    return CATEGORY_ORDER.flatMap((cat) => {
      const items = map.get(cat)
      return items ? [{ cat, items }] : []
    })
  }, [derived, ingredientMap])

  const checkedCount = checkedIds.length + manualItems.filter((m) => m.checked).length
  const totalCount = derived.length + manualItems.length

  function handleCheck(ingredientId: string) {
    dispatch(toggleIngredientChecked(ingredientId))
  }

  /** Mark all checked derived ingredients as in-stock in the pantry. */
  function handleMarkPurchased() {
    for (const id of checkedIds) {
      dispatch(updatePantryItem({ ingredientId: id, payload: { inStock: true } }))
    }
    dispatch(uncheckAll())
  }

  function handleAddManual() {
    const name = newItemName.trim()
    if (!name) return
    dispatch(addManualItem({ name, quantity: newItemQty.trim(), checked: false }))
    setNewItemName('')
    setNewItemQty('')
  }

  function handleClearAll() {
    if (!window.confirm(t('shoppingList.confirmClear'))) return
    dispatch(clearAll())
  }

  if (plannedMeals.length === 0) {
    return (
      <div className="shopping-list-view__empty">
        <p>{t('shoppingList.empty')}</p>
        <Button onClick={() => navigate('/meal-plan')}>{t('nav.mealPlan')} →</Button>
      </div>
    )
  }

  return (
    <div className="shopping-list-view">
      {/* Summary bar */}
      <div className="shopping-list-view__summary">
        <span className="shopping-list-view__count">
          {t('shoppingList.generated', { count: String(derived.length) })}
        </span>
        <div className="shopping-list-view__actions">
          {checkedIds.length > 0 && (
            <Button onClick={handleMarkPurchased}>
              {t('shoppingList.updatePantry')} ({checkedIds.length})
            </Button>
          )}
          {totalCount > 0 && (
            <Button variant="secondary" onClick={handleClearAll}>
              {t('shoppingList.clearAll')}
            </Button>
          )}
        </div>
      </div>

      {checkedCount === totalCount && totalCount > 0 && (
        <p className="shopping-list-view__all-checked">
          <Badge variant="success">{t('shoppingList.allChecked')}</Badge>
        </p>
      )}

      {/* Grouped ingredient list */}
      {grouped.map(({ cat, items }) => (
        <section key={cat} className="shopping-list-view__group">
          <h3 className="shopping-list-view__group-title">
            {t(`ingredients.categories.${cat}`)}
          </h3>
          <ul className="shopping-list-view__items">
            {items.map((item) => {
              const ing = ingredientMap.get(item.ingredientId)
              const checked = checkedIds.includes(item.ingredientId)
              const recipeNames = item.recipeIds
                .map((id) => recipeMap.get(id)?.title)
                .filter(Boolean)
                .join(', ')

              return (
                <li
                  key={`${item.ingredientId}::${item.unit}`}
                  className={`shopping-list-view__item${checked ? ' shopping-list-view__item--checked' : ''}`}
                >
                  <label className="shopping-list-view__check-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleCheck(item.ingredientId)}
                      className="shopping-list-view__checkbox"
                    />
                    <span className="shopping-list-view__name">{ing?.name ?? item.ingredientId}</span>
                  </label>
                  <span className="shopping-list-view__qty">
                    {Math.round(item.quantity * 10) / 10} {item.unit}
                  </span>
                  {recipeNames && (
                    <span className="shopping-list-view__for">{recipeNames}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {/* Manual items */}
      <section className="shopping-list-view__group">
        <h3 className="shopping-list-view__group-title">{t('shoppingList.manualSection')}</h3>

        {manualItems.length > 0 && (
          <ul className="shopping-list-view__items">
            {manualItems.map((item) => (
              <li
                key={item.id}
                className={`shopping-list-view__item${item.checked ? ' shopping-list-view__item--checked' : ''}`}
              >
                <label className="shopping-list-view__check-label">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => dispatch(toggleManualItemChecked(item.id))}
                    className="shopping-list-view__checkbox"
                  />
                  <span className="shopping-list-view__name">{item.name}</span>
                </label>
                {item.quantity && (
                  <span className="shopping-list-view__qty">{item.quantity}</span>
                )}
                <button
                  type="button"
                  className="shopping-list-view__remove"
                  onClick={() => dispatch(removeManualItem(item.id))}
                  aria-label={t('common.delete')}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add manual item form */}
        <div className="shopping-list-view__add-manual">
          <input
            type="text"
            className="shopping-list-view__text-input"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={t('shoppingList.addItemPlaceholder')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddManual() }}
          />
          <input
            type="text"
            className="shopping-list-view__text-input shopping-list-view__text-input--qty"
            value={newItemQty}
            onChange={(e) => setNewItemQty(e.target.value)}
            placeholder={t('shoppingList.qtyPlaceholder')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddManual() }}
          />
          <Button onClick={handleAddManual} disabled={!newItemName.trim()}>
            {t('shoppingList.addItem')}
          </Button>
        </div>
      </section>
    </div>
  )
}
