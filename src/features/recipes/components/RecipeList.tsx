import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Modal, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { fetchRecipes } from '../recipesSlice'
import type { RecipeFilters } from '../types'
import { RecipeCard } from './RecipeCard'
import { RecipeFilters as RecipeFiltersPanel } from './RecipeFilters'
import { RecipeForm } from './RecipeForm'
import './RecipeList.scss'

/**
 * Full recipe browser: search bar, collapsible filter panel, responsive card grid.
 * New recipe creation opens in a large modal.
 */
export function RecipeList() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const { items: recipes, status, error } = useAppSelector((s) => s.recipes)

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<RecipeFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (status === 'idle' && recipes.length === 0) {
      dispatch(fetchRecipes())
    }
  }, [dispatch, status, recipes.length])

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
        <Button onClick={() => setShowAdd(true)}>{t('recipes.addRecipe')}</Button>
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

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={t('recipes.addRecipe')}
        size="large"
      >
        <RecipeForm onDone={() => setShowAdd(false)} />
      </Modal>
    </div>
  )
}
