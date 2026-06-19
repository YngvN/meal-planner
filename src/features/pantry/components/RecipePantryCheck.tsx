import { useState } from 'react'
import { CheckCircle2, LoaderCircle, Search, ShoppingCart } from 'lucide-react'
import { useLanguage } from '../../../i18n'
import { useAppSelector } from '../../../app/hooks'
import { useRecipeFeasibility, type IngredientGroup } from '../useRecipeFeasibility'
import { searchOFFProducts, type OFFSearchResult } from '../../ingredients/productsApi'
import type { RecipeIngredient } from '../../recipes/types'
import './RecipePantryCheck.scss'

interface Props {
  ingredients: RecipeIngredient[]
}

/** Expandable row per missing ingredient that searches OFF for product suggestions. */
function OFFSuggestions({ group, country }: { group: IngredientGroup; country: string }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<OFFSearchResult[]>([])
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (searched) { setOpen((v) => !v); return }
    setOpen(true)
    setLoading(true)
    try {
      const r = await searchOFFProducts(group.name, country, 5)
      setResults(r)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="recipe-pantry-check__off-suggestions">
      <button
        type="button"
        className="recipe-pantry-check__find-btn"
        onClick={handleSearch}
        aria-expanded={open}
      >
        <Search size={12} aria-hidden />
        {t('pantry.feasibility.findProducts')}
      </button>

      {open && (
        <div className="recipe-pantry-check__off-results">
          {loading && (
            <span className="recipe-pantry-check__off-loading">
              <LoaderCircle size={14} className="icon-spin" aria-hidden />
              {t('common.loading')}
            </span>
          )}
          {!loading && results.length === 0 && searched && (
            <span className="recipe-pantry-check__off-empty">{t('pantry.feasibility.noProductsFound')}</span>
          )}
          {results.map((r) => (
            <div key={r.barcode} className="recipe-pantry-check__off-card">
              {r.imageUrl && (
                <img src={r.imageUrl} alt={r.name} className="recipe-pantry-check__off-img" loading="lazy" />
              )}
              <div className="recipe-pantry-check__off-info">
                <span className="recipe-pantry-check__off-name">{r.name}</span>
                {r.brand && <span className="recipe-pantry-check__off-brand">{r.brand}</span>}
                {r.stores && r.stores.length > 0 && (
                  <span className="recipe-pantry-check__off-stores">{r.stores.slice(0, 2).join(', ')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Shows whether the user can make a recipe based on their current pantry.
 * Accounts for ingredient alternatives — having ANY member of a group in
 * stock counts as satisfied.
 * For missing ingredients, shows OFF product search suggestions.
 */
export function RecipePantryCheck({ ingredients }: Props) {
  const { t } = useLanguage()
  const country = useAppSelector((s) => s.settings.country)
  const { canMake, missingCount, missingGroups, matchRatio } = useRecipeFeasibility(ingredients)

  if (ingredients.length === 0) return null

  return (
    <div className={`recipe-pantry-check ${canMake ? 'recipe-pantry-check--ok' : 'recipe-pantry-check--missing'}`}>
      <div className="recipe-pantry-check__header">
        {canMake ? (
          <CheckCircle2 size={18} aria-hidden className="recipe-pantry-check__icon" />
        ) : (
          <ShoppingCart size={18} aria-hidden className="recipe-pantry-check__icon" />
        )}
        <span className="recipe-pantry-check__title">
          {canMake
            ? t('pantry.feasibility.canMake')
            : t('pantry.feasibility.missing', { count: String(missingCount) })}
        </span>
        <span className="recipe-pantry-check__ratio">
          {Math.round(matchRatio * 100)}%
        </span>
      </div>

      {!canMake && missingGroups.length > 0 && (
        <ul className="recipe-pantry-check__missing-list">
          {missingGroups.map((g) => (
            <li key={g.ids[0]} className="recipe-pantry-check__missing-item">
              <span className="recipe-pantry-check__missing-name">
                {g.name}
                {g.ids.length > 1 && (
                  <span className="recipe-pantry-check__missing-alternatives">
                    {' '}({t('pantry.feasibility.orAlternatives', { alts: g.ids.slice(1).join(', ') })})
                  </span>
                )}
              </span>
              <OFFSuggestions group={g} country={country} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
