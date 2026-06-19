import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, Check, Clock, Star, X } from 'lucide-react'
import { Alert, Badge, Button, Modal, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import type { Ingredient } from '../../ingredients/types'
import type { NutritionalValues } from '../../shared/types'
import { deleteRecipe, fetchRecipeById, toggleFavorite } from '../recipesSlice'
import type { Recipe, RecipeIngredient } from '../types'
import { ALL_UNIT_KEYS, convertUnit, getUnitDimension, roundConverted } from '../../shared/units'
import { localizedIngredientName, localizedProductName, localizeRecipe } from '../../shared/localize'
import { MealDoneModal } from './MealDoneModal'
import './RecipeDetail.scss'

/**
 * Calculates total nutritional values for a recipe from its ingredient data.
 * Ingredient nutrition is expressed per 100g/100ml; quantity is the weight/volume used.
 * Returns null when no ingredient has nutrition data.
 */
function calculateNutrition(
  recipe: Recipe,
  ingredientMap: Map<string, Ingredient>,
): NutritionalValues | null {
  let hasAny = false
  const totals: NutritionalValues = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

  for (const ri of recipe.ingredients) {
    const ing = ingredientMap.get(ri.ingredientId)
    if (!ing) continue

    // Use subproduct nutrition if selected, fall back to parent
    const nutrition = ri.productId
      ? (ing.products?.find((sp) => sp.id === ri.productId)?.nutrition ?? ing.nutrition)
      : ing.nutrition

    if (!nutrition) continue
    hasAny = true

    const factor = ri.quantity / 100
    if (nutrition.calories !== undefined) totals.calories! += nutrition.calories * factor
    if (nutrition.protein !== undefined) totals.protein! += nutrition.protein * factor
    if (nutrition.carbs !== undefined) totals.carbs! += nutrition.carbs * factor
    if (nutrition.fat !== undefined) totals.fat! += nutrition.fat * factor
    if (nutrition.fiber !== undefined) totals.fiber! += nutrition.fiber * factor
  }

  if (!hasAny) return null
  return {
    calories: Math.round(totals.calories!),
    protein: Math.round(totals.protein! * 10) / 10,
    carbs: Math.round(totals.carbs! * 10) / 10,
    fat: Math.round(totals.fat! * 10) / 10,
    fiber: Math.round(totals.fiber! * 10) / 10,
  }
}

/** Renders a nutrition block, shared between manual and calculated modes. */
function NutritionBlock({
  nutrition,
  label,
}: {
  nutrition: NutritionalValues
  label: string
}) {
  const { t } = useLanguage()
  return (
    <div className="recipe-detail__nutrition-block">
      <span className="recipe-detail__nutrition-label">{label}</span>
      <div className="recipe-detail__nutrition">
        {nutrition.calories !== undefined && (
          <div className="recipe-detail__nutrient">
            <span>{t('recipes.nutrients.calories')}</span>
            <strong>{nutrition.calories} kcal</strong>
          </div>
        )}
        {nutrition.protein !== undefined && (
          <div className="recipe-detail__nutrient">
            <span>{t('recipes.nutrients.protein')}</span>
            <strong>{nutrition.protein}g</strong>
          </div>
        )}
        {nutrition.carbs !== undefined && (
          <div className="recipe-detail__nutrient">
            <span>{t('recipes.nutrients.carbs')}</span>
            <strong>{nutrition.carbs}g</strong>
          </div>
        )}
        {nutrition.fat !== undefined && (
          <div className="recipe-detail__nutrient">
            <span>{t('recipes.nutrients.fat')}</span>
            <strong>{nutrition.fat}g</strong>
          </div>
        )}
        {nutrition.fiber !== undefined && (
          <div className="recipe-detail__nutrient">
            <span>{t('recipes.nutrients.fiber')}</span>
            <strong>{nutrition.fiber}g</strong>
          </div>
        )}
      </div>
    </div>
  )
}

interface RecipeDetailProps {
  recipeId: string
}

/**
 * Full recipe detail view.
 * Shows all metadata, ingredients with pantry indicators, instructions,
 * source attribution, and nutrition (manual or calculated from ingredients).
 */
export function RecipeDetail({ recipeId }: RecipeDetailProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t, language } = useLanguage()

  const { selectedRecipe: rawRecipe, status, error } = useAppSelector((s) => s.recipes)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)

  const [searchParams] = useSearchParams()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showMealDone, setShowMealDone] = useState(false)
  // ingredientId → target unit key selected in the toggle
  const [convertedUnits, setConvertedUnits] = useState<Map<string, string>>(new Map())

  const mealId = searchParams.get('mealId') ?? undefined

  useEffect(() => {
    dispatch(fetchRecipeById(recipeId))
  }, [dispatch, recipeId])

  if (status === 'loading') return <Spinner />
  if (status === 'failed') return <Alert variant="error">{error ?? t('common.error')}</Alert>
  if (!rawRecipe) return null

  const recipe = localizeRecipe(rawRecipe, language)
  const pantryMap = new Map(pantryItems.map((p) => [p.ingredientId, p]))
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))

  function getIngredientName(ri: RecipeIngredient) {
    const ing = ingredientMap.get(ri.ingredientId)
    if (!ing) return ri.ingredientId
    const baseName = localizedIngredientName(ing, language)
    if (ri.productId) {
      const sp = ing.products?.find((s) => s.id === ri.productId)
      if (sp) return `${baseName} — ${localizedProductName(sp, language)}`
    }
    return baseName
  }

  function isInPantry(ingredientId: string) {
    return pantryMap.get(ingredientId)?.inStock === true
  }

  async function handleDelete() {
    await dispatch(deleteRecipe(recipe!.id))
    navigate('/recipes')
  }

  const totalMinutes = recipe.prepTimeMinutes + recipe.cookTimeMinutes
  const calculatedNutrition = calculateNutrition(recipe, ingredientMap)

  return (
    <article className="recipe-detail">
      <div className="recipe-detail__actions-top">
        <Button variant="secondary" onClick={() => navigate('/recipes')}>
          <ArrowLeft size={16} aria-hidden /> {t('common.back')}
        </Button>
        <div className="recipe-detail__action-group">
          <Button onClick={() => setShowMealDone(true)}>
            <Check size={16} aria-hidden /> {t('recipes.mealDone')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => dispatch(toggleFavorite(recipe.id))}
            title={recipe.isFavorite ? t('recipes.unfavorite') : t('recipes.favorite')}
          >
            <Star size={16} fill={recipe.isFavorite ? 'currentColor' : 'none'} aria-hidden /> {recipe.isFavorite ? t('recipes.unfavorite') : t('recipes.favorite')}
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
            {t('common.edit')}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
            {t('common.delete')}
          </Button>
        </div>
      </div>

      {recipe.imageUrl && (
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="recipe-detail__hero"
          loading="lazy"
        />
      )}

      <header className="recipe-detail__header">
        <h1 className="recipe-detail__title">{recipe.title}</h1>
        {recipe.description && <p className="recipe-detail__description">{recipe.description}</p>}

        {recipe.source && (
          <p className="recipe-detail__source">
            <span className="recipe-detail__source-label">{t('recipes.source.source')}: </span>
            {recipe.source.type === 'website' && recipe.source.url ? (
              <a href={recipe.source.url} target="_blank" rel="noopener noreferrer">
                {recipe.source.name}
              </a>
            ) : (
              <span>{recipe.source.name}</span>
            )}
            <Badge variant="neutral">{t(`recipes.sourceType.${recipe.source.type}`)}</Badge>
          </p>
        )}
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
            const ing = ingredientMap.get(ri.ingredientId)
            const targetUnit = convertedUnits.get(ri.ingredientId)
            const convertedQty = targetUnit
              ? convertUnit(ri.quantity, ri.unit, targetUnit, ing?.density)
              : null

            // Only offer target units that are in the same or cross dimension
            const fromDim = getUnitDimension(ri.unit)
            const compatibleUnits = fromDim
              ? ALL_UNIT_KEYS.filter((u) => {
                  if (u === ri.unit) return false
                  const toDim = getUnitDimension(u)
                  if (!toDim || toDim === 'count') return false
                  if (toDim === fromDim) return true
                  // Cross-dimension only if density is set
                  return ing?.density !== undefined
                })
              : []

            return (
              <li
                key={`${ri.ingredientId}-${ri.productId ?? ''}`}
                className={['recipe-detail__ingredient', !inPantry && 'recipe-detail__ingredient--missing'].filter(Boolean).join(' ')}
              >
                <span className="recipe-detail__ingredient-status">
                  {inPantry ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
                </span>
                <span className="recipe-detail__ingredient-qty">
                  <strong>{ri.quantity} {ri.unit}</strong>
                  {convertedQty !== null && targetUnit && (
                    <span className="recipe-detail__ingredient-converted">
                      ≈ {roundConverted(convertedQty)} {targetUnit}
                    </span>
                  )}
                </span>
                <span className="recipe-detail__ingredient-name">{getIngredientName(ri)}</span>
                {!inPantry && (
                  <Badge variant="warning">{t('recipes.missingFromPantry')}</Badge>
                )}
                {compatibleUnits.length > 0 && (
                  <span className="recipe-detail__unit-toggle">
                    <ArrowLeftRight size={14} aria-hidden />
                    <select
                      className="recipe-detail__unit-toggle-select"
                      value={targetUnit ?? ''}
                      onChange={(e) => {
                        const next = new Map(convertedUnits)
                        if (e.target.value) next.set(ri.ingredientId, e.target.value)
                        else next.delete(ri.ingredientId)
                        setConvertedUnits(next)
                      }}
                      aria-label={t('converter.convertTo')}
                    >
                      <option value="">{ri.unit}</option>
                      {compatibleUnits.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </span>
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
                    <Clock size={14} aria-hidden /> {step.timerMinutes} {t('recipes.minutes')}
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

      {(recipe.nutrition || calculatedNutrition) && (
        <section className="recipe-detail__section">
          <h2>{t('recipes.nutrition.nutrition')}</h2>
          {recipe.nutrition ? (
            <NutritionBlock
              nutrition={recipe.nutrition}
              label={t('recipes.nutrition.manual')}
            />
          ) : calculatedNutrition ? (
            <NutritionBlock
              nutrition={calculatedNutrition}
              label={t('recipes.nutrition.calculated')}
            />
          ) : null}
        </section>
      )}

      {showMealDone && (
        <MealDoneModal
          recipe={recipe}
          mealId={mealId}
          onClose={() => setShowMealDone(false)}
        />
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('common.confirmDeleteTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleDelete}>{t('common.delete')}</Button>
          </>
        }
      >
        <p>{t('common.confirmDelete')}</p>
      </Modal>
    </article>
  )
}
