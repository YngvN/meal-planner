import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, Modal, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { useState } from 'react'
import { deleteRecipe, fetchRecipeById, toggleFavorite } from '../recipesSlice'
import './RecipeDetail.scss'

interface RecipeDetailProps {
  /** Recipe id from the route. */
  recipeId: string
}

/**
 * Full recipe detail view.
 * Shows all metadata, ingredients (with missing-from-pantry indicators), and step-by-step instructions.
 */
export function RecipeDetail({ recipeId }: RecipeDetailProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const { selectedRecipe: recipe, status, error } = useAppSelector((s) => s.recipes)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)

  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    dispatch(fetchRecipeById(recipeId))
  }, [dispatch, recipeId])

  if (status === 'loading') return <Spinner />
  if (status === 'failed') return <Alert variant="error">{error ?? t('common.error')}</Alert>
  if (!recipe) return null

  const pantryMap = new Map(pantryItems.map((p) => [p.ingredientId, p]))
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))

  function getIngredientName(id: string) {
    return ingredientMap.get(id)?.name ?? id
  }

  function isInPantry(ingredientId: string) {
    const item = pantryMap.get(ingredientId)
    return item?.inStock === true
  }

  async function handleDelete() {
    await dispatch(deleteRecipe(recipe!.id))
    navigate('/recipes')
  }

  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes

  return (
    <article className="recipe-detail">
      <div className="recipe-detail__actions-top">
        <Button variant="secondary" onClick={() => navigate('/recipes')}>
          ← {t('common.back')}
        </Button>
        <div className="recipe-detail__action-group">
          <Button
            variant="secondary"
            onClick={() => dispatch(toggleFavorite(recipe.id))}
            title={recipe.isFavorite ? t('recipes.unfavorite') : t('recipes.favorite')}
          >
            {recipe.isFavorite ? '★' : '☆'} {recipe.isFavorite ? t('recipes.unfavorite') : t('recipes.favorite')}
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
            {t('common.edit')}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
            {t('common.delete')}
          </Button>
        </div>
      </div>

      <header className="recipe-detail__header">
        <h1 className="recipe-detail__title">{recipe.title}</h1>
        {recipe.description && <p className="recipe-detail__description">{recipe.description}</p>}
      </header>

      <div className="recipe-detail__meta">
        <div className="recipe-detail__meta-item">
          <span className="recipe-detail__meta-label">{t('recipes.prepTime')}</span>
          <span>{recipe.prepTimeMinutes} {t('recipes.minutes')}</span>
        </div>
        <div className="recipe-detail__meta-item">
          <span className="recipe-detail__meta-label">{t('recipes.cookTime')}</span>
          <span>{recipe.cookTimeMinutes} {t('recipes.minutes')}</span>
        </div>
        <div className="recipe-detail__meta-item">
          <span className="recipe-detail__meta-label">{t('recipes.totalTime')}</span>
          <span>{totalMinutes} {t('recipes.minutes')}</span>
        </div>
        <div className="recipe-detail__meta-item">
          <span className="recipe-detail__meta-label">{t('recipes.portions')}</span>
          <span>{recipe.portions}</span>
        </div>
        <div className="recipe-detail__meta-item">
          <span className="recipe-detail__meta-label">{t('recipes.skillLevel')}</span>
          <span>{t(`recipes.skill.${recipe.skillLevel}`)}</span>
        </div>
      </div>

      <div className="recipe-detail__tags">
        {recipe.dietaryTags.map((tag) => (
          <Badge key={tag} variant="success">{tag}</Badge>
        ))}
        {recipe.mealTags.map((tag) => (
          <Badge key={tag} variant="info">{t(`recipes.mealTag.${tag}`)}</Badge>
        ))}
        {recipe.cuisineTypes.map((c) => (
          <Badge key={c} variant="neutral">{c}</Badge>
        ))}
        {recipe.tags.map((tag) => (
          <Badge key={tag} variant="neutral">{tag}</Badge>
        ))}
      </div>

      <section className="recipe-detail__section">
        <h2>{t('recipes.ingredients')}</h2>
        <ul className="recipe-detail__ingredient-list">
          {recipe.ingredients.map((ri) => {
            const inPantry = isInPantry(ri.ingredientId)
            return (
              <li key={ri.ingredientId} className={['recipe-detail__ingredient', !inPantry && 'recipe-detail__ingredient--missing'].filter(Boolean).join(' ')}>
                <span className="recipe-detail__ingredient-status">{inPantry ? '✓' : '✗'}</span>
                <span>
                  <strong>{ri.quantity} {ri.unit}</strong> {getIngredientName(ri.ingredientId)}
                </span>
                {!inPantry && (
                  <Badge variant="warning">{t('recipes.missingFromPantry')}</Badge>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="recipe-detail__section">
        <h2>{t('recipes.instructions')}</h2>
        <ol className="recipe-detail__steps">
          {recipe.instructions
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <li key={step.order} className="recipe-detail__step">
                <p>{step.description}</p>
                {step.timerMinutes && (
                  <span className="recipe-detail__step-timer">
                    🕐 {step.timerMinutes} {t('recipes.minutes')}
                  </span>
                )}
              </li>
            ))}
        </ol>
      </section>

      {recipe.notes && (
        <section className="recipe-detail__section">
          <h2>{t('recipes.notes')}</h2>
          <p className="recipe-detail__notes">{recipe.notes}</p>
        </section>
      )}

      {recipe.nutrition && (
        <section className="recipe-detail__section">
          <h2>{t('recipes.nutrition')}</h2>
          <div className="recipe-detail__nutrition">
            {recipe.nutrition.calories !== undefined && (
              <div className="recipe-detail__nutrient">
                <span>{t('recipes.nutrients.calories')}</span>
                <strong>{recipe.nutrition.calories} kcal</strong>
              </div>
            )}
            {recipe.nutrition.protein !== undefined && (
              <div className="recipe-detail__nutrient">
                <span>{t('recipes.nutrients.protein')}</span>
                <strong>{recipe.nutrition.protein}g</strong>
              </div>
            )}
            {recipe.nutrition.carbs !== undefined && (
              <div className="recipe-detail__nutrient">
                <span>{t('recipes.nutrients.carbs')}</span>
                <strong>{recipe.nutrition.carbs}g</strong>
              </div>
            )}
            {recipe.nutrition.fat !== undefined && (
              <div className="recipe-detail__nutrient">
                <span>{t('recipes.nutrients.fat')}</span>
                <strong>{recipe.nutrition.fat}g</strong>
              </div>
            )}
            {recipe.nutrition.fiber !== undefined && (
              <div className="recipe-detail__nutrient">
                <span>{t('recipes.nutrients.fiber')}</span>
                <strong>{recipe.nutrition.fiber}g</strong>
              </div>
            )}
          </div>
        </section>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('common.confirmDeleteTitle')}
      >
        <p>{t('common.confirmDelete')}</p>
        <div className="recipe-detail__modal-actions">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDelete}>{t('common.delete')}</Button>
        </div>
      </Modal>
    </article>
  )
}
