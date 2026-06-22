import { useEffect, useMemo, useState } from 'react'
import { View, Text, FlatList } from 'react-native'
import { Camera, Plus } from 'lucide-react-native'
import { Alert, Button, Modal, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { RecipePhotoScanner } from '../../ai/components/RecipePhotoScanner'
import type { RecipeDraft } from '../../ai/types'
import { fetchRecipes } from '../recipesSlice'
import type { RecipeFilters } from '../types'
import { RecipeCard } from './RecipeCard'
import { RecipeFilters as RecipeFiltersPanel } from './RecipeFilters'
import { RecipeForm } from './RecipeForm'

/**
 * Full recipe browser: search bar, collapsible filter panel, scrollable card list.
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
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-app-text dark:text-text-dark">
            {t('recipes.title')}
          </Text>
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={() => setShowScanner(true)}>
              <Camera size={16} color="#6b7280" />
            </Button>
            <Button onPress={() => setShowAdd(true)}>
              <Plus size={16} color="#ffffff" />
            </Button>
          </View>
        </View>

        <View className="flex-row gap-2 items-center">
          <View className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('recipes.search')}
            />
          </View>
          <Button variant="secondary" onPress={() => setShowFilters((v) => !v)}>
            {showFilters ? t('recipes.filters.hide') : t('recipes.filters.show')}
          </Button>
        </View>

        {showFilters && (
          <RecipeFiltersPanel filters={filters} onChange={setFilters} />
        )}
      </View>

      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="text-text-muted dark:text-text-muted-dark text-center">
            {t('recipes.noResults')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecipeCard recipe={item} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
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
    </View>
  )
}
