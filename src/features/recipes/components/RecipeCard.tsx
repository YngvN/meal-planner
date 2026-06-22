import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Clock, Gauge, Star, Users } from 'lucide-react-native'
import { Badge, Button } from '../../../components'
import { useAppDispatch } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { localizeRecipe } from '../../shared/localize'
import { toggleFavorite } from '../recipesSlice'
import type { Recipe } from '../types'

interface RecipeCardProps {
  recipe: Recipe
}

/**
 * Compact recipe card shown in the recipe list grid.
 * Displays cover image (if set), title, key metadata, dietary tags, and a favorite toggle.
 */
export function RecipeCard({ recipe: rawRecipe }: RecipeCardProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { t, language } = useLanguage()
  const recipe = localizeRecipe(rawRecipe, language)
  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes

  function handleFavorite() {
    dispatch(toggleFavorite(recipe.id))
  }

  return (
    <Pressable
      className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark overflow-hidden active:opacity-80"
      onPress={() => router.push(`/recipes/${recipe.id}` as any)}
      accessibilityRole="button"
    >
      {recipe.imageUrl && (
        <Image
          source={{ uri: recipe.imageUrl }}
          style={{ width: '100%', height: 160 }}
          contentFit="cover"
        />
      )}

      <View className="p-3 gap-2">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-base font-semibold text-app-text dark:text-text-dark">
            {recipe.title}
          </Text>
          <Pressable
            onPress={handleFavorite}
            className="p-1 active:opacity-70"
            accessibilityLabel={recipe.isFavorite ? t('recipes.unfavorite') : t('recipes.favorite')}
          >
            <Star
              size={18}
              fill={recipe.isFavorite ? 'currentColor' : 'none'}
              color={recipe.isFavorite ? '#f59e0b' : '#6b7280'}
            />
          </Pressable>
        </View>

        {recipe.createdByUsername && (
          <Text className="text-xs text-text-muted dark:text-text-muted-dark">
            by {recipe.createdByUsername}
          </Text>
        )}

        {recipe.description && (
          <Text className="text-sm text-text-muted dark:text-text-muted-dark" numberOfLines={2}>
            {recipe.description}
          </Text>
        )}

        <View className="flex-row flex-wrap gap-3">
          <View className="flex-row items-center gap-1">
            <Clock size={13} color="#6b7280" />
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">
              {totalMinutes} {t('recipes.minutes')}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Users size={13} color="#6b7280" />
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">
              {recipe.portions}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Gauge size={13} color="#6b7280" />
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">
              {t(`recipes.skill.${recipe.skillLevel}`)}
            </Text>
          </View>
        </View>

        {recipe.dietaryTags.length > 0 && (
          <View className="flex-row flex-wrap gap-1">
            {recipe.dietaryTags.map((tag) => (
              <Badge key={tag} variant="success">{tag}</Badge>
            ))}
          </View>
        )}

        {recipe.mealTags.length > 0 && (
          <View className="flex-row flex-wrap gap-1">
            {recipe.mealTags.map((tag) => (
              <Badge key={tag} variant="info">{tag}</Badge>
            ))}
          </View>
        )}

        <Button
          variant="secondary"
          onPress={() => router.push(`/recipes/${recipe.id}` as any)}
        >
          {t('recipes.viewRecipe')}
        </Button>
      </View>
    </Pressable>
  )
}
