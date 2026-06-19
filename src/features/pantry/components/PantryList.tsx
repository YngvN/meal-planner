import { useEffect, useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Alert, Badge, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { fetchIngredients } from '../../ingredients/ingredientsSlice'
import { localizedIngredientName } from '../../shared/localize'
import { roundConverted } from '../../shared/units'
import { fetchPantry, updatePantryItem } from '../pantrySlice'
import { PantryDetailModal } from './PantryDetailModal'
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
  const { t, language } = useLanguage()

  const { items: pantryItems, status, error } = useAppSelector((s) => s.pantry)
  const ingredients = useAppSelector((s) => s.ingredients.items)

  const [search, setSearch] = useState('')
  const [detailIngredientId, setDetailIngredientId] = useState<string | null>(null)

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
        pantryItem: pantryMap.get(ing.id) ?? { id: '', ingredientId: ing.id, inStock: false, isLow: false },
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

      {grouped.length === 0 && (
        <p className="pantry-list__empty">{t('pantry.empty')}</p>
      )}

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
                  onClick={() => setDetailIngredientId(ingredient.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setDetailIngredientId(ingredient.id)}
                  aria-label={t('pantry.editItem')}
                >
                  {/* Label wraps only the checkbox so clicking the name doesn't toggle it */}
                  <label
                    className="pantry-row__check-area"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={pantryItem.inStock ? t('pantry.inStock') : t('pantry.outOfStock')}
                  >
                    <input
                      type="checkbox"
                      checked={pantryItem.inStock}
                      onChange={(e) => handleToggle(ingredient.id, e.target.checked)}
                      className="pantry-row__checkbox"
                    />
                  </label>
                  <span className="pantry-row__name">{localizedIngredientName(ingredient, language)}</span>

                  <div className="pantry-row__badges">
                    {pantryItem.quantity !== undefined && (
                      <span className="pantry-row__qty">
                        {roundConverted(pantryItem.quantity)}{pantryItem.unit ? ` ${pantryItem.unit}` : ''}
                      </span>
                    )}
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
                      onClick={(e) => { e.stopPropagation(); handleLowToggle(ingredient.id, !pantryItem.isLow) }}
                      title={t('pantry.markLow')}
                      aria-label={t('pantry.markLow')}
                    >
                      <TriangleAlert size={16} aria-hidden />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
      {detailIngredientId && (
        <PantryDetailModal
          ingredientId={detailIngredientId}
          onClose={() => setDetailIngredientId(null)}
        />
      )}
    </div>
  )
}
