import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { CheckCircle2, LoaderCircle, Search, ShoppingCart } from 'lucide-react-native'
import { useLanguage } from '../../../i18n'
import { useAppSelector } from '../../../store/hooks'
import { useRecipeFeasibility, type IngredientGroup } from '../useRecipeFeasibility'
import { searchOFFProducts, type OFFSearchResult } from '../../ingredients/productsApi'
import type { RecipeIngredient } from '../../recipes/types'

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
    <View className="gap-2 mt-1">
      <Pressable
        onPress={handleSearch}
        className="flex-row items-center gap-1 active:opacity-70"
        accessibilityRole="button"
      >
        <Search size={12} color="#7c3aed" />
        <Text className="text-xs text-accent dark:text-accent-dark">
          {t('pantry.feasibility.findProducts')}
        </Text>
      </Pressable>

      {open && (
        <View className="gap-2 pl-2">
          {loading && (
            <View className="flex-row items-center gap-1">
              <LoaderCircle size={12} color="#6b7280" />
              <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('common.loading')}</Text>
            </View>
          )}
          {!loading && results.length === 0 && searched && (
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">
              {t('pantry.feasibility.noProductsFound')}
            </Text>
          )}
          {results.map((r) => (
            <View key={r.barcode} className="flex-row gap-2 bg-surface dark:bg-surface-dark rounded-lg p-2">
              {r.imageUrl && (
                <Image source={{ uri: r.imageUrl }} style={{ width: 40, height: 40, borderRadius: 6 }} contentFit="contain" />
              )}
              <View className="flex-1">
                <Text className="text-xs font-medium text-app-text dark:text-text-dark">{r.name}</Text>
                {r.brand && <Text className="text-xs text-text-muted dark:text-text-muted-dark">{r.brand}</Text>}
                {r.stores && r.stores.length > 0 && (
                  <Text className="text-xs text-text-muted dark:text-text-muted-dark">{r.stores.slice(0, 2).join(', ')}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
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
    <View className={`rounded-xl p-3 border gap-2 ${canMake ? 'bg-success-bg dark:bg-success-bg-dark border-success-border dark:border-success-border-dark' : 'bg-warning-bg dark:bg-warning-bg-dark border-warning-border dark:border-warning-border-dark'}`}>
      <View className="flex-row items-center gap-2">
        {canMake
          ? <CheckCircle2 size={18} color="#22c55e" />
          : <ShoppingCart size={18} color="#f59e0b" />
        }
        <Text className="flex-1 text-sm font-semibold text-app-text dark:text-text-dark">
          {canMake
            ? t('pantry.feasibility.canMake')
            : t('pantry.feasibility.missing', { count: String(missingCount) })}
        </Text>
        <Text className="text-sm font-semibold text-text-muted dark:text-text-muted-dark">
          {Math.round(matchRatio * 100)}%
        </Text>
      </View>

      {!canMake && missingGroups.length > 0 && (
        <View className="gap-2 pl-2">
          {missingGroups.map((g) => (
            <View key={g.ids[0]}>
              <Text className="text-sm text-app-text dark:text-text-dark">
                {g.name}
                {g.ids.length > 1 && (
                  <Text className="text-text-muted dark:text-text-muted-dark">
                    {' '}({t('pantry.feasibility.orAlternatives', { alts: g.ids.slice(1).join(', ') })})
                  </Text>
                )}
              </Text>
              <OFFSuggestions group={g} country={country} />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
