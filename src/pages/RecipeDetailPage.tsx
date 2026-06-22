import { useLocalSearchParams } from 'expo-router'
import { Alert } from '../components'
import { RecipeDetail } from '../features/recipes/components/RecipeDetail'
import { useLanguage } from '../i18n'

/** Route: /recipes/:id */
export function RecipeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useLanguage()

  if (!id) return <Alert variant="error">{t('common.error')}</Alert>
  return <RecipeDetail recipeId={id} />
}
