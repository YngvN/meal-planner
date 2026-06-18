import { useNavigate } from 'react-router-dom'
import { Badge, Button } from '../../../components'
import { useAppDispatch } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { toggleFavorite } from '../recipesSlice'
import type { Recipe } from '../types'
import './RecipeCard.scss'

interface RecipeCardProps {
  recipe: Recipe
}

/**
 * Compact recipe card shown in the recipe list grid.
 * Displays cover image (if set), title, key metadata, dietary tags, and a favorite toggle.
 */
export function RecipeCard({ recipe }: RecipeCardProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch(toggleFavorite(recipe.id))
  }

  return (
    <article className="recipe-card" onClick={() => navigate(`/recipes/${recipe.id}`)}>
      {recipe.imageUrl && (
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="recipe-card__image"
          loading="lazy"
        />
      )}

      <div className="recipe-card__body">
        <div className="recipe-card__header">
          <h3 className="recipe-card__title">{recipe.title}</h3>
          <button
            type="button"
            className={['recipe-card__favorite', recipe.isFavorite && 'recipe-card__favorite--active'].filter(Boolean).join(' ')}
            onClick={handleFavorite}
            aria-label={recipe.isFavorite ? t('recipes.unfavorite') : t('recipes.favorite')}
            title={recipe.isFavorite ? t('recipes.unfavorite') : t('recipes.favorite')}
          >
            {recipe.isFavorite ? '★' : '☆'}
          </button>
        </div>

        {recipe.description && (
          <p className="recipe-card__description">{recipe.description}</p>
        )}

        <div className="recipe-card__meta">
          <span className="recipe-card__meta-item" title={t('recipes.totalTime')}>
            🕐 {totalMinutes} {t('recipes.minutes')}
          </span>
          <span className="recipe-card__meta-item" title={t('recipes.portions')}>
            👥 {recipe.portions}
          </span>
          <span className="recipe-card__meta-item" title={t('recipes.skillLevel')}>
            📊 {t(`recipes.skill.${recipe.skillLevel}`)}
          </span>
        </div>

        {recipe.dietaryTags.length > 0 && (
          <div className="recipe-card__tags">
            {recipe.dietaryTags.map((tag) => (
              <Badge key={tag} variant="success">{tag}</Badge>
            ))}
          </div>
        )}

        {recipe.mealTags.length > 0 && (
          <div className="recipe-card__tags">
            {recipe.mealTags.map((tag) => (
              <Badge key={tag} variant="info">{tag}</Badge>
            ))}
          </div>
        )}

        <Button
          variant="secondary"
          className="recipe-card__cta"
          onClick={(e) => { e.stopPropagation(); navigate(`/recipes/${recipe.id}`) }}
        >
          {t('recipes.viewRecipe')}
        </Button>
      </div>
    </article>
  )
}
