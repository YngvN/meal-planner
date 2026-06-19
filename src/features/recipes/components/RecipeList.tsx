import { useEffect, useMemo, useState } from 'react'
import { Camera, Plus } from 'lucide-react'
import { Alert, Button, Modal, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { RecipePhotoScanner } from '../../ai/components/RecipePhotoScanner'
import type { RecipeDraft } from '../../ai/types'
import { fetchRecipes } from '../recipesSlice'
import type { RecipeFilters } from '../types'
import { RecipeCard } from './RecipeCard'
import { RecipeFilters as RecipeFiltersPanel } from './RecipeFilters'
import { RecipeForm } from './RecipeForm'
import './RecipeList.scss'

/**
 * Full recipe browser: search bar, collapsible filter panel, responsive card grid.
 * New recipe creation opens in a large modal; a camera button opens the
 * multi-photo AI scanner which pre-fills the creation form on success.
 */
export function RecipeList() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const { items: recipes, status, error } = useAppSelector((s) => s.recipes)

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<RecipeFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannedDraft, setScannedDraft] = useState<RecipeDraft | null>(null)

  useEffect(() => {
    if (status === 'idle' && recipes.length === 0) {
      dispatch(fetchRecipes())
    }
  }, [dispatch, status, recipes.length])

  function handleScanResult(draft: RecipeDraft) {
    setScannedDraft(draft)
    setShowScanner(false)
    setShowAdd(true)
  }

  function closeAddModal() {
    setShowAdd(false)
    setScannedDraft(null)
  }

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filters.favoritesOnly && !r.isFavorite) return false
      if (filters.skillLevel && r.skillLevel !== filters.skillLevel) return false
      if (filters.dietaryTags?.length) {
        if (!filters.dietaryTags.every((tag) => r.dietaryTags.includes(tag))) return false
      }
      if (filters.mealTags?.length) {
        if (!filters.mealTags.some((tag) => r.mealTags.includes(tag))) return false
      }
      return true
    })
  }, [recipes, search, filters])

  if (status === 'loading') return <Spinner />
  if (status === 'failed') return <Alert variant="error">{error ?? t('common.error')}</Alert>

  return (
    <div className="recipe-list">
      <div className="recipe-list__header">
        <h1 className="recipe-list__title">{t('recipes.title')}</h1>
        <div className="recipe-list__header-actions">
          <Button variant="secondary" onClick={() => setShowScanner(true)}>
            <Camera size={16} aria-hidden />
            {t('recipes.scanRecipe')}
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} aria-hidden />
            {t('recipes.addRecipe')}
          </Button>
        </div>
      </div>

      <div className="recipe-list__toolbar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('recipes.search')}
          className="recipe-list__search"
        />
        <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
          {showFilters ? t('recipes.filters.hide') : t('recipes.filters.show')}
        </Button>
      </div>

      {showFilters && (
        <RecipeFiltersPanel filters={filters} onChange={setFilters} />
      )}

      {filtered.length === 0 ? (
        <p className="recipe-list__empty">{t('recipes.noResults')}</p>
      ) : (
        <div className="recipe-list__grid">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      {/* Multi-photo AI scanner */}
      {showScanner && (
        <RecipePhotoScanner
          onResult={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Recipe creation / edit modal — may be pre-filled from a scan */}
      <Modal
        open={showAdd}
        onClose={closeAddModal}
        title={t('recipes.addRecipe')}
        size="large"
      >
        <RecipeForm
          initialDraft={scannedDraft ?? undefined}
          onDone={closeAddModal}
        />
      </Modal>
    </div>
  )
}
