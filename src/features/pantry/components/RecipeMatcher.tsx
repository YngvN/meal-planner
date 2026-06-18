import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../../../components'
import { useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import type { RecipeMatch } from '../types'
import './RecipeMatcher.scss'

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
  const navigate = useNavigate()

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
    <section className="recipe-matcher">
      <h2 className="recipe-matcher__title">{t('pantry.whatCanIMake')}</h2>
      <div className="recipe-matcher__list">
        {matches.map(({ recipeId, matchRatio, missingIngredientIds }) => {
          const recipe = recipeMap.get(recipeId)
          if (!recipe) return null
          const pct = Math.round(matchRatio * 100)
          const canMake = missingIngredientIds.length === 0

          return (
            <div
              key={recipeId}
              className={['matcher-card', canMake && 'matcher-card--ready'].filter(Boolean).join(' ')}
            >
              <div className="matcher-card__bar" style={{ width: `${pct}%` }} />
              <div className="matcher-card__content">
                <div className="matcher-card__top">
                  <span className="matcher-card__name">{recipe.title}</span>
                  <span className="matcher-card__pct">{pct}%</span>
                </div>

                {missingIngredientIds.length > 0 ? (
                  <p className="matcher-card__missing">
                    {t('pantry.missing', { count: String(missingIngredientIds.length) })}:{' '}
                    {missingIngredientIds.map((id) => ingredientMap.get(id)?.name ?? id).join(', ')}
                  </p>
                ) : (
                  <Badge variant="success">{t('pantry.readyToMake')}</Badge>
                )}

                <Button
                  variant="secondary"
                  className="matcher-card__btn"
                  onClick={() => navigate(`/recipes/${recipeId}`)}
                >
                  {t('recipes.viewRecipe')}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
