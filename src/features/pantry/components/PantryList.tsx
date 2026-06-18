import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { fetchIngredients } from '../../ingredients/ingredientsSlice'
import { fetchPantry, updatePantryItem } from '../pantrySlice'
import './PantryList.scss'

/** Snapshot of the current time taken once when the module first loads. */
const MODULE_LOAD_TIME = Date.now()

/** Returns true when an ISO expiry date is within 3 days of module load time. */
function isExpiringSoon(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false
  const daysLeft = (new Date(expiresAt).getTime() - MODULE_LOAD_TIME) / (1000 * 60 * 60 * 24)
  return daysLeft <= 3
}

/**
 * Pantry inventory view grouped by ingredient category.
 * Shows in-stock toggles, low-stock flag, and expiry dates.
 */
export function PantryList() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()

  const { items: pantryItems, status, error } = useAppSelector((s) => s.pantry)
  const ingredients = useAppSelector((s) => s.ingredients.items)

  const [search, setSearch] = useState('')

  useEffect(() => {
    if (ingredients.length === 0) dispatch(fetchIngredients())
    if (pantryItems.length === 0) dispatch(fetchPantry())
  }, [dispatch, ingredients.length, pantryItems.length])

  const pantryMap = useMemo(() => new Map(pantryItems.map((p) => [p.ingredientId, p])), [pantryItems])

  const rows = useMemo(() => {
    return ingredients
      .filter((ing) => ing.name.toLowerCase().includes(search.toLowerCase()))
      .map((ing) => ({
        ingredient: ing,
        pantryItem: pantryMap.get(ing.id) ?? { ingredientId: ing.id, inStock: false, isLow: false },
      }))
  }, [ingredients, pantryMap, search])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>()
    for (const row of rows) {
      const cat = row.ingredient.category
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(row)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  function handleToggle(ingredientId: string, inStock: boolean) {
    const ingredient = ingredients.find((i) => i.id === ingredientId)
    let expiresAt: string | undefined
    if (inStock && ingredient?.defaultExpiryDays) {
      const d = new Date()
      d.setDate(d.getDate() + ingredient.defaultExpiryDays)
      expiresAt = d.toISOString()
    }
    dispatch(updatePantryItem({ ingredientId, payload: { inStock, ...(expiresAt ? { expiresAt } : {}) } }))
  }

  function handleLowToggle(ingredientId: string, isLow: boolean) {
    dispatch(updatePantryItem({ ingredientId, payload: { isLow } }))
  }

  if (status === 'loading') return <Spinner />
  if (status === 'failed') return <Alert variant="error">{error ?? t('common.error')}</Alert>

  return (
    <div className="pantry-list">
      <div className="pantry-list__header">
        <h1>{t('pantry.title')}</h1>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder={t('pantry.search')} />

      {grouped.map(([category, rows]) => (
        <section key={category} className="pantry-list__group">
          <h2 className="pantry-list__group-title">
            {t(`ingredients.categories.${category}`)}
          </h2>
          <div className="pantry-list__rows">
            {rows.map(({ ingredient, pantryItem }) => {
              const expiring = isExpiringSoon(pantryItem.expiresAt)
              return (
                <div
                  key={ingredient.id}
                  className={['pantry-row', !pantryItem.inStock && 'pantry-row--out'].filter(Boolean).join(' ')}
                >
                  <input
                    type="checkbox"
                    id={`stock-${ingredient.id}`}
                    checked={pantryItem.inStock}
                    onChange={(e) => handleToggle(ingredient.id, e.target.checked)}
                    className="pantry-row__checkbox"
                  />
                  <label htmlFor={`stock-${ingredient.id}`} className="pantry-row__name">
                    {ingredient.name}
                  </label>

                  <div className="pantry-row__badges">
                    {pantryItem.isLow && (
                      <Badge variant="warning">{t('pantry.low')}</Badge>
                    )}
                    {expiring && (
                      <Badge variant="error">{t('pantry.expiringSoon')}</Badge>
                    )}
                    {pantryItem.expiresAt && (
                      <span className="pantry-row__expiry">
                        {t('pantry.expires')}: {new Date(pantryItem.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="pantry-row__controls">
                    <button
                      type="button"
                      className={['pantry-row__low-btn', pantryItem.isLow && 'pantry-row__low-btn--active'].filter(Boolean).join(' ')}
                      onClick={() => handleLowToggle(ingredient.id, !pantryItem.isLow)}
                      title={t('pantry.markLow')}
                    >
                      ⚠
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
