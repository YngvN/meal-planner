import { useMemo } from 'react'
import { View, Text, Pressable, FlatList } from 'react-native'
import { useRouter } from 'expo-router'
import { Badge, Button } from '../../../components'
import { useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import type { RecipeMatch } from '../types'

interface RecipeMatcherProps {
  /** Limit the number of results shown. Omit to show all. */
  limit?: number
}

/**
 * "What can I make?" panel.
 * Scores every recipe by how many of its required ingredients are in the pantry
 * and sorts from best match to worst. Shows missing ingredients for each.
 */
export function RecipeMatcher({ limit }: RecipeMatcherProps) {
  const { t } = useLanguage()
  const router = useRouter()

  const recipes = useAppSelector((s) => s.recipes.items)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)

  const pantryStockedIds = useMemo(
    () => new Set(pantryItems.filter((p) => p.inStock).map((p) => p.ingredientId)),
    [pantryItems],
  )

  const ingredientMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])

  const matches: RecipeMatch[] = useMemo(() => {
    const all = recipes
      .map((recipe): RecipeMatch => {
        const required = recipe.ingredients.map((ri) => ri.ingredientId)
        const missing = required.filter((id) => !pantryStockedIds.has(id))
        const matchRatio = required.length > 0 ? (required.length - missing.length) / required.length : 1
        return { recipeId: recipe.id, matchRatio, missingIngredientIds: missing }
      })
      .sort((a, b) => b.matchRatio - a.matchRatio)
    return limit !== undefined ? all.slice(0, limit) : all
  }, [recipes, pantryStockedIds, limit])

  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  if (recipes.length === 0) return null

  return (
    <View className="gap-2">
      {matches.map(({ recipeId, matchRatio, missingIngredientIds }) => {
        const recipe = recipeMap.get(recipeId)
        if (!recipe) return null
        const pct = Math.round(matchRatio * 100)
        const canMake = missingIngredientIds.length === 0

        return (
          <View
            key={recipeId}
            className={`bg-surface dark:bg-surface-dark rounded-xl border overflow-hidden ${canMake ? 'border-success dark:border-success-dark' : 'border-border dark:border-border-dark'}`}
          >
            {/* Progress bar */}
            <View className="h-1.5 bg-border dark:bg-border-dark">
              <View
                className={`h-full ${canMake ? 'bg-success' : 'bg-accent dark:bg-accent-dark'}`}
                style={{ width: `${pct}%` }}
              />
            </View>

            <View className="p-3 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-sm font-semibold text-app-text dark:text-text-dark">
                  {recipe.title}
                </Text>
                <Text className="text-sm font-semibold text-text-muted dark:text-text-muted-dark">
                  {pct}%
                </Text>
              </View>

              {missingIngredientIds.length > 0 ? (
                <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                  {t('pantry.missing', { count: String(missingIngredientIds.length) })}:{' '}
                  {missingIngredientIds.map((id) => ingredientMap.get(id)?.name ?? id).join(', ')}
                </Text>
              ) : (
                <Badge variant="success">{t('pantry.readyToMake')}</Badge>
              )}

              <Button
                variant="secondary"
                onPress={() => router.push(`/recipes/${recipeId}` as any)}
              >
                {t('recipes.viewRecipe')}
              </Button>
            </View>
          </View>
        )
      })}
    </View>
  )
}
