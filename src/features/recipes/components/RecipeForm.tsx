import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Input, NumberInput, Select, TagInput } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { createRecipe, updateRecipe } from '../recipesSlice'
import type { CreateRecipePayload, DietaryTag, MealTag, Recipe, RecipeIngredient, RecipeStep, SkillLevel } from '../types'
import './RecipeForm.scss'

const DIETARY_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free']
const MEAL_TAGS: MealTag[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']
const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced']
const COMMON_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece', 'clove', 'slice', 'handful', 'pinch']

interface FormState {
  title: string
  description: string
  portions: number
  prepTimeMinutes: number
  cookTimeMinutes: number
  skillLevel: SkillLevel
  cuisineTypes: string[]
  dietaryTags: DietaryTag[]
  mealTags: MealTag[]
  tags: string[]
  equipment: string[]
  notes: string
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
}

/** Builds a FormState from an existing recipe (edit mode). */
function buildFormState(recipe: Recipe): FormState {
  return {
    title: recipe.title,
    description: recipe.description,
    portions: recipe.portions,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    skillLevel: recipe.skillLevel,
    cuisineTypes: recipe.cuisineTypes,
    dietaryTags: recipe.dietaryTags,
    mealTags: recipe.mealTags,
    tags: recipe.tags,
    equipment: recipe.equipment,
    notes: recipe.notes ?? '',
    ingredients: recipe.ingredients,
    steps: recipe.instructions.length > 0 ? recipe.instructions : [{ order: 1, description: '' }],
  }
}

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  portions: 4,
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  skillLevel: 'beginner',
  cuisineTypes: [],
  dietaryTags: [],
  mealTags: [],
  tags: [],
  equipment: [],
  notes: '',
  ingredients: [],
  steps: [{ order: 1, description: '' }],
}

interface RecipeFormProps {
  /** Provide to switch to edit mode. The recipe must already be loaded. */
  initialValues?: Recipe
}

/**
 * Create / edit form for a recipe.
 * In edit mode, pass `initialValues` with the already-fetched recipe.
 * The parent is responsible for fetching and passing the data.
 */
export function RecipeForm({ initialValues }: RecipeFormProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const isEdit = !!initialValues

  // Lazy initialization so we never call setState in effects
  const [form, setForm] = useState<FormState>(() =>
    initialValues ? buildFormState(initialValues) : DEFAULT_FORM,
  )
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { items: ingredientLibrary } = useAppSelector((s) => s.ingredients)

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ─── Ingredient rows ──────────────────────────────────────────────────────

  function addIngredientRow() {
    patch('ingredients', [...form.ingredients, { ingredientId: '', quantity: 1, unit: 'g' }])
  }

  function updateIngredientRow(idx: number, p: Partial<RecipeIngredient>) {
    patch('ingredients', form.ingredients.map((r, i) => (i === idx ? { ...r, ...p } : r)))
  }

  function removeIngredientRow(idx: number) {
    patch('ingredients', form.ingredients.filter((_, i) => i !== idx))
  }

  // ─── Steps ───────────────────────────────────────────────────────────────

  function addStep() {
    patch('steps', [...form.steps, { order: form.steps.length + 1, description: '' }])
  }

  function updateStep(idx: number, p: Partial<RecipeStep>) {
    patch('steps', form.steps.map((s, i) => (i === idx ? { ...s, ...p } : s)))
  }

  function removeStep(idx: number) {
    patch('steps', form.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))
  }

  // ─── Tag toggles ─────────────────────────────────────────────────────────

  function toggleDietary(tag: DietaryTag) {
    const next = form.dietaryTags.includes(tag)
      ? form.dietaryTags.filter((t) => t !== tag)
      : [...form.dietaryTags, tag]
    patch('dietaryTags', next)
  }

  function toggleMeal(tag: MealTag) {
    const next = form.mealTags.includes(tag)
      ? form.mealTags.filter((t) => t !== tag)
      : [...form.mealTags, tag]
    patch('mealTags', next)
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    const payload: CreateRecipePayload = {
      title: form.title,
      description: form.description,
      portions: form.portions,
      prepTimeMinutes: form.prepTimeMinutes,
      cookTimeMinutes: form.cookTimeMinutes,
      skillLevel: form.skillLevel,
      cuisineTypes: form.cuisineTypes,
      dietaryTags: form.dietaryTags,
      mealTags: form.mealTags,
      seasonalTags: [],
      tags: form.tags,
      equipment: form.equipment,
      notes: form.notes,
      ingredients: form.ingredients.filter((r) => r.ingredientId),
      instructions: form.steps.filter((s) => s.description.trim()),
      isFavorite: initialValues?.isFavorite ?? false,
    }

    try {
      if (isEdit) {
        await dispatch(updateRecipe({ id: initialValues.id, payload })).unwrap()
        navigate(`/recipes/${initialValues.id}`)
      } else {
        const result = await dispatch(createRecipe(payload)).unwrap()
        navigate(`/recipes/${result.id}`)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      <div className="recipe-form__header">
        <h1>{isEdit ? t('recipes.editRecipe') : t('recipes.addRecipe')}</h1>
        <div className="recipe-form__header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(isEdit ? `/recipes/${initialValues!.id}` : '/recipes')}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit">{t('common.save')}</Button>
        </div>
      </div>

      {submitError && <Alert variant="error">{submitError}</Alert>}

      <section className="recipe-form__section">
        <h2>{t('recipes.form.basics')}</h2>
        <div className="recipe-form__row">
          <Input
            id="title"
            label={t('recipes.form.title')}
            value={form.title}
            onChange={(e) => patch('title', e.target.value)}
            required
          />
        </div>
        <div className="recipe-form__row">
          <div className="input-field">
            <label htmlFor="description">{t('recipes.form.description')}</label>
            <textarea
              id="description"
              className="recipe-form__textarea"
              value={form.description}
              onChange={(e) => patch('description', e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="recipe-form__row recipe-form__row--3col">
          <NumberInput
            id="portions"
            label={t('recipes.portions')}
            value={form.portions}
            onChange={(v) => patch('portions', v)}
            min={1}
            max={100}
          />
          <NumberInput
            id="prepTime"
            label={`${t('recipes.prepTime')} (min)`}
            value={form.prepTimeMinutes}
            onChange={(v) => patch('prepTimeMinutes', v)}
            min={0}
            step={5}
          />
          <NumberInput
            id="cookTime"
            label={`${t('recipes.cookTime')} (min)`}
            value={form.cookTimeMinutes}
            onChange={(v) => patch('cookTimeMinutes', v)}
            min={0}
            step={5}
          />
        </div>
        <div className="recipe-form__row recipe-form__row--2col">
          <Select
            id="skillLevel"
            label={t('recipes.skillLevel')}
            value={form.skillLevel}
            onChange={(e) => patch('skillLevel', e.target.value as SkillLevel)}
            options={SKILL_LEVELS.map((s) => ({ value: s, label: t(`recipes.skill.${s}`) }))}
          />
          <TagInput
            label={t('recipes.cuisineTypes')}
            tags={form.cuisineTypes}
            onChange={(v) => patch('cuisineTypes', v)}
            placeholder={t('recipes.form.addCuisine')}
          />
        </div>
      </section>

      <section className="recipe-form__section">
        <h2>{t('recipes.form.tags')}</h2>
        <div className="recipe-form__row">
          <span className="recipe-form__sublabel">{t('recipes.filters.dietary')}</span>
          <div className="recipe-form__chips">
            {DIETARY_TAGS.map((tag) => (
              <label key={tag} className="recipe-form__chip-label">
                <input
                  type="checkbox"
                  checked={form.dietaryTags.includes(tag)}
                  onChange={() => toggleDietary(tag)}
                />
                {tag}
              </label>
            ))}
          </div>
        </div>
        <div className="recipe-form__row">
          <span className="recipe-form__sublabel">{t('recipes.filters.mealType')}</span>
          <div className="recipe-form__chips">
            {MEAL_TAGS.map((tag) => (
              <label key={tag} className="recipe-form__chip-label">
                <input
                  type="checkbox"
                  checked={form.mealTags.includes(tag)}
                  onChange={() => toggleMeal(tag)}
                />
                {t(`recipes.mealTag.${tag}`)}
              </label>
            ))}
          </div>
        </div>
        <div className="recipe-form__row recipe-form__row--2col">
          <TagInput
            label={t('recipes.tags')}
            tags={form.tags}
            onChange={(v) => patch('tags', v)}
            placeholder={t('recipes.form.addTag')}
          />
          <TagInput
            label={t('recipes.equipment')}
            tags={form.equipment}
            onChange={(v) => patch('equipment', v)}
            placeholder={t('recipes.form.addEquipment')}
          />
        </div>
      </section>

      <section className="recipe-form__section">
        <h2>{t('recipes.ingredients')}</h2>
        {form.ingredients.map((row, idx) => (
          <div key={idx} className="recipe-form__ingredient-row">
            <select
              className="recipe-form__ingredient-select"
              value={row.ingredientId}
              onChange={(e) => updateIngredientRow(idx, { ingredientId: e.target.value })}
            >
              <option value="">{t('recipes.form.selectIngredient')}</option>
              {ingredientLibrary.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
            <NumberInput
              value={row.quantity}
              onChange={(v) => updateIngredientRow(idx, { quantity: v })}
              min={0.1}
              step={0.5}
            />
            <select
              className="recipe-form__unit-select"
              value={row.unit}
              onChange={(e) => updateIngredientRow(idx, { unit: e.target.value })}
            >
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <Button type="button" variant="secondary" onClick={() => removeIngredientRow(idx)}>×</Button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addIngredientRow}>
          + {t('recipes.form.addIngredient')}
        </Button>
      </section>

      <section className="recipe-form__section">
        <h2>{t('recipes.instructions')}</h2>
        {form.steps.map((step, idx) => (
          <div key={idx} className="recipe-form__step-row">
            <span className="recipe-form__step-num">{idx + 1}</span>
            <div className="recipe-form__step-fields">
              <div className="input-field">
                <textarea
                  className="recipe-form__textarea recipe-form__textarea--step"
                  value={step.description}
                  onChange={(e) => updateStep(idx, { description: e.target.value })}
                  placeholder={t('recipes.form.stepDescription')}
                  rows={2}
                />
              </div>
              <NumberInput
                value={step.timerMinutes ?? 0}
                onChange={(v) => updateStep(idx, { timerMinutes: v || undefined })}
                min={0}
                step={1}
                label={`${t('recipes.form.timer')} (min, 0 = none)`}
              />
            </div>
            {form.steps.length > 1 && (
              <Button type="button" variant="secondary" onClick={() => removeStep(idx)}>×</Button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addStep}>
          + {t('recipes.form.addStep')}
        </Button>
      </section>

      <section className="recipe-form__section">
        <h2>{t('recipes.notes')}</h2>
        <div className="input-field">
          <textarea
            id="notes"
            className="recipe-form__textarea"
            value={form.notes}
            onChange={(e) => patch('notes', e.target.value)}
            rows={3}
            placeholder={t('recipes.form.notesPlaceholder')}
          />
        </div>
      </section>
    </form>
  )
}
