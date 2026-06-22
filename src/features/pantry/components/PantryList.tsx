import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, FlatList, SectionList } from 'react-native'
import { Barcode, Plus, TriangleAlert } from 'lucide-react-native'
import { Alert, Badge, Button, Checkbox, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { fetchIngredients } from '../../ingredients/ingredientsSlice'
import { localizedIngredientName } from '../../shared/localize'
import { roundConverted } from '../../shared/units'
import { fetchPantry, updatePantryItem } from '../pantrySlice'
import { PantryDetailModal } from './PantryDetailModal'
import { PantryScanAdd } from './PantryScanAdd'

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
  const [showScan, setShowScan] = useState(false)

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

  const sections = useMemo(() => {
    const map = new Map<string, typeof rows>()
    for (const row of rows) {
      const cat = row.ingredient.category
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(row)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, data]) => ({ title: category, data }))
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
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="px-4 pt-4 pb-2 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-app-text dark:text-text-dark">{t('pantry.title')}</Text>
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={() => setShowScan(true)}>
              <Barcode size={16} color="#6b7280" />
            </Button>
            <Button onPress={() => setDetailIngredientId('__pick__')}>
              <Plus size={16} color="#ffffff" />
            </Button>
          </View>
        </View>
        <SearchBar value={search} onChange={setSearch} placeholder={t('pantry.search')} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.ingredient.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={
          <Text className="text-center text-text-muted dark:text-text-muted-dark py-8">
            {t('pantry.empty')}
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <Text className="text-sm font-semibold text-text-muted dark:text-text-muted-dark py-2 mt-2 uppercase tracking-wide">
            {t(`ingredients.categories.${section.title}`)}
          </Text>
        )}
        renderItem={({ item: { ingredient, pantryItem } }) => {
          const expiring = isExpiringSoon(pantryItem.expiresAt)
          return (
            <Pressable
              className={`flex-row items-center gap-2 py-3 border-b border-border dark:border-border-dark ${!pantryItem.inStock ? 'opacity-60' : ''}`}
              onPress={() => setDetailIngredientId(ingredient.id)}
              accessibilityLabel={t('pantry.editItem')}
            >
              {/* Checkbox — stop press propagation so tapping it doesn't also open detail */}
              <Pressable onPress={(e) => { e.stopPropagation(); handleToggle(ingredient.id, !pantryItem.inStock) }}>
                <Checkbox
                  label=""
                  checked={pantryItem.inStock}
                  onChange={(v) => handleToggle(ingredient.id, v)}
                />
              </Pressable>

              <Text className="flex-1 text-base text-app-text dark:text-text-dark">
                {localizedIngredientName(ingredient, language)}
              </Text>

              <View className="flex-row items-center gap-1 flex-shrink-0">
                {pantryItem.quantity !== undefined && (
                  <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                    {roundConverted(pantryItem.quantity)}{pantryItem.unit ? ` ${pantryItem.unit}` : ''}
                  </Text>
                )}
                {pantryItem.isLow && <Badge variant="warning">{t('pantry.low')}</Badge>}
                {expiring && <Badge variant="error">{t('pantry.expiringSoon')}</Badge>}

                {/* Low-stock toggle */}
                <Pressable
                  onPress={() => handleLowToggle(ingredient.id, !pantryItem.isLow)}
                  className="p-1 active:opacity-70"
                  accessibilityLabel={t('pantry.markLow')}
                >
                  <TriangleAlert
                    size={16}
                    color={pantryItem.isLow ? '#f59e0b' : '#d1d5db'}
                    fill={pantryItem.isLow ? '#f59e0b' : 'none'}
                  />
                </Pressable>
              </View>
            </Pressable>
          )
        }}
      />

      {detailIngredientId && detailIngredientId !== '__pick__' && (
        <PantryDetailModal
          ingredientId={detailIngredientId}
          onClose={() => setDetailIngredientId(null)}
        />
      )}

      {showScan && <PantryScanAdd onClose={() => setShowScan(false)} />}
    </View>
  )
}
