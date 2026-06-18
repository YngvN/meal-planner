import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, IngredientCombobox, Input, NumberInput, Select, TagInput } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { Plus, X } from 'lucide-react'
import { createIngredient } from '../../ingredients/ingredientsSlice'
import { RecipeScanButton } from '../../ai/components/RecipeScanButton'
import { createRecipe, updateRecipe } from '../recipesSlice'
import type {
  CreateRecipePayload,
  DietaryTag,
  MealTag,
  Recipe,
  RecipeIngredient,
  RecipeSource,
  RecipeSourceType,
  RecipeStep,
  SkillLevel,
} from '../types'
import './RecipeForm.scss'

const DIETARY_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free']
const MEAL_TAGS: MealTag[] = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert']
const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced']
const SOURCE_TYPES: RecipeSourceType[] = ['website', 'book', 'person']
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
  sourceEnabled: boolean
  sourceType: RecipeSourceType
  sourceName: string
  sourceUrl: string
  imageUrl: string
}

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
    sourceEnabled: !!recipe.source,
    sourceType: recipe.source?.type ?? 'website',
    sourceName: recipe.source?.name ?? '',
    sourceUrl: recipe.source?.url ?? '',
    imageUrl: recipe.imageUrl ?? '',
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
  sourceEnabled: false,
  sourceType: 'website',
  sourceName: '',
  sourceUrl: '',
  imageUrl: '',
}

interface RecipeFormProps {
  /** Provide to switch to edit mode. The recipe must already be loaded. */
  initialValues?: Recipe
  /** When provided (modal mode), called on successful create instead of navigating. */
  onDone?: () => void
}

/**
 * Create / edit form for a recipe.
 * Modal mode: pass `onDone` — called on successful create.
 * Full-page edit mode: pass `initialValues` — navigates on save.
 */
export function RecipeForm({ initialValues, onDone }: RecipeFormProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const isEdit = !!initialValues

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

  // ─── Inline ingredient creation ───────────────────────────────────────────

  async function handleCreateIngredient(name: string): Promise<string> {
    const result = await dispatch(createIngredient({ name, category: 'other' })).unwrap()
    return result.id
  }

  /** Resolves an ingredient name to a library id, creating the ingredient if needed. */
  async function resolveIngredientId(name: string): Promise<string> {
    const term = name.trim().toLowerCase()
    const existing = ingredientLibrary.find(
      (i) =>
        i.name.toLowerCase() === term ||
        Object.values(i.nameI18n ?? {}).some((n) => n.toLowerCase() === term),
    )
    if (existing) return existing.id
    return handleCreateIngredient(name.trim())
  }

  /** Applies an AI-transcribed recipe draft to the form, resolving ingredients to the library. */
  async function applyRecipeDraft(draft: import('../../ai/types').RecipeDraft) {
    const resolved: RecipeIngredient[] = []
    for (const di of draft.ingredients) {
      const ingredientId = await resolveIngredientId(di.name)
      resolved.push({ ingredientId, quantity: di.quantity, unit: di.unit })
    }

    setForm((prev) => ({
      ...prev,
      title: draft.title || prev.title,
      description: draft.description ?? prev.description,
      portions: draft.portions ?? prev.portions,
      prepTimeMinutes: draft.prepTimeMinutes ?? prev.prepTimeMinutes,
      cookTimeMinutes: draft.cookTimeMinutes ?? prev.cookTimeMinutes,
      ingredients: resolved.length > 0 ? resolved : prev.ingredients,
      steps:
        draft.instructions.length > 0
          ? draft.instructions.map((description, i) => ({ order: i + 1, description }))
          : prev.steps,
    }))
  }

  // ─── Source helpers ───────────────────────────────────────────────────────

  function buildSource(): RecipeSource | undefined {
    if (!form.sourceEnabled || !form.sourceName.trim()) return undefined
    return {
      type: form.sourceType,
      name: form.sourceName.trim(),
      url: form.sourceType === 'website' && form.sourceUrl.trim() ? form.sourceUrl.trim() : undefined,
    }
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────

  function handleCancel() {
    if (onDone) {
      onDone()
    } else {
      navigate(isEdit ? `/recipes/${initialValues!.id}` : '/recipes')
    }
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
      source: buildSource(),
      imageUrl: form.imageUrl.trim() || undefined,
    }

    try {
      if (isEdit) {
        await dispatch(updateRecipe({ id: initialValues.id, payload })).unwrap()
        navigate(`/recipes/${initialValues.id}`)
      } else {
        const result = await dispatch(createRecipe(payload)).unwrap()
        if (onDone) {
          onDone()
          navigate(`/recipes/${result.id}`)
        } else {
          navigate(`/recipes/${result.id}`)
        }
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      {!onDone && (
        <div className="recipe-form__header">
          <h1>{isEdit ? t('recipes.editRecipe') : t('recipes.addRecipe')}</h1>
          <div className="recipe-form__header-actions">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </div>
      )}

      {submitError && <Alert variant="error">{submitError}</Alert>}

      {/* ─── Basic info ─────────────────────────────────────────────── */}
      <section className="recipe-form__section">
        <div className="recipe-form__section-header">
          <h2>{t('recipes.form.basics')}</h2>
          <RecipeScanButton onResult={applyRecipeDraft} onError={setSubmitError} />
        </div>
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
        <div className="recipe-form__row recipe-form__row--image">
          <div className="input-field">
            <label htmlFor="imageUrl">{t('recipes.imageUrl')}</label>
            <input
              id="imageUrl"
              type="url"
              className="input"
              value={form.imageUrl}
              onChange={(e) => patch('imageUrl', e.target.value)}
              placeholder="https://…"
            />
          </div>
          {form.imageUrl.trim() && (
            <img
              src={form.imageUrl}
              alt={t('common.imagePreview')}
              className="recipe-form__image-preview"
            />
          )}
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

      {/* ─── Source ─────────────────────────────────────────────────── */}
      <section className="recipe-form__section">
        <div className="recipe-form__source-header">
          <h2>{t('recipes.source')}</h2>
          <label className="recipe-form__chip-label">
            <input
              type="checkbox"
              checked={form.sourceEnabled}
              onChange={(e) => patch('sourceEnabled', e.target.checked)}
            />
            {t('recipes.form.addSource')}
          </label>
        </div>
        {form.sourceEnabled && (
          <div className="recipe-form__row recipe-form__row--3col">
            <Select
              id="sourceType"
              label={t('recipes.source.type')}
              value={form.sourceType}
              onChange={(e) => patch('sourceType', e.target.value as RecipeSourceType)}
              options={SOURCE_TYPES.map((s) => ({ value: s, label: t(`recipes.sourceType.${s}`) }))}
            />
            <Input
              id="sourceName"
              label={t('recipes.source.name')}
              value={form.sourceName}
              onChange={(e) => patch('sourceName', e.target.value)}
              placeholder={
                form.sourceType === 'website' ? 'e.g. Serious Eats'
                : form.sourceType === 'book' ? 'e.g. The Silver Spoon'
                : 'e.g. Grandma Maria'
              }
            />
            {form.sourceType === 'website' && (
              <Input
                id="sourceUrl"
                label={t('recipes.source.url')}
                type="url"
                value={form.sourceUrl}
                onChange={(e) => patch('sourceUrl', e.target.value)}
                placeholder="https://..."
              />
            )}
          </div>
        )}
      </section>

      {/* ─── Tags ───────────────────────────────────────────────────── */}
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

      {/* ─── Ingredients ────────────────────────────────────────────── */}
      <section className="recipe-form__section">
        <h2>{t('recipes.ingredients')}</h2>
        {form.ingredients.map((row, idx) => {
          const selectedIngredient = ingredientLibrary.find((i) => i.id === row.ingredientId)
          const subproducts = selectedIngredient?.subproducts ?? []
          return (
            <div key={idx} className="recipe-form__ingredient-row">
              <IngredientCombobox
                value={row.ingredientId || undefined}
                onChange={(id) => updateIngredientRow(idx, { ingredientId: id, subproductId: undefined })}
                options={ingredientLibrary}
                onCreateNew={handleCreateIngredient}
                placeholder={t('recipes.form.selectIngredient')}
                className="recipe-form__ingredient-combobox"
              />
              {subproducts.length > 0 && (
                <select
                  className="recipe-form__subproduct-select"
                  value={row.subproductId ?? ''}
                  onChange={(e) => updateIngredientRow(idx, { subproductId: e.target.value || undefined })}
                >
                  <option value="">{t('recipes.form.defaultVariant')}</option>
                  {subproducts.map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              )}
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
              <Button type="button" variant="secondary" onClick={() => removeIngredientRow(idx)} aria-label={t('common.delete')}>
                <X size={16} aria-hidden />
              </Button>
            </div>
          )
        })}
        <Button type="button" variant="secondary" onClick={addIngredientRow}>
          <Plus size={16} aria-hidden /> {t('recipes.form.addIngredient')}
        </Button>
      </section>

      {/* ─── Instructions ───────────────────────────────────────────── */}
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
              <Button type="button" variant="secondary" onClick={() => removeStep(idx)} aria-label={t('common.delete')}>
                <X size={16} aria-hidden />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addStep}>
          <Plus size={16} aria-hidden /> {t('recipes.form.addStep')}
        </Button>
      </section>

      {/* ─── Notes ──────────────────────────────────────────────────── */}
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

      {/* ─── Modal-mode footer ───────────────────────────────────────── */}
      {onDone && (
        <div className="recipe-form__modal-footer">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit">{t('common.save')}</Button>
        </div>
      )}
    </form>
  )
}
