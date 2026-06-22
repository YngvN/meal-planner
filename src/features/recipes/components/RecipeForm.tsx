import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Switch } from 'react-native'
import { useDraftPersistence } from '../../../hooks/useDraftPersistence'
import { useRouter } from 'expo-router'
import { Alert, Button, Checkbox, IngredientCombobox, InlineEdit, Input, NumberInput, Select, TagInput, TranslatedText } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { Info, Plus, Trash2, X } from 'lucide-react-native'
import { createIngredient } from '../../ingredients/ingredientsSlice'
import { RecipeScanButton } from '../../ai/components/RecipeScanButton'
import { createRecipe, updateRecipe } from '../recipesSlice'
import { localizeUnit } from '../../shared/localize'
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
import type { RecipeDraft } from '../../ai/types'

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
  /** When provided, pre-fills the form with an AI-scanned draft on mount. */
  initialDraft?: RecipeDraft
  /** When provided (modal mode), called on successful create instead of navigating. */
  onDone?: () => void
}

/**
 * Create / edit form for a recipe.
 * Modal mode: pass `onDone` — called on successful create.
 * Full-page edit mode: pass `initialValues` — navigates on save.
 * AI scan mode: pass `initialDraft` — auto-applies draft on mount.
 */
export function RecipeForm({ initialValues, initialDraft, onDone }: RecipeFormProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { t } = useLanguage()
  const isEdit = !!initialValues

  const draftKey = initialValues?.id ? `recipe:${initialValues.id}` : 'recipe:new'
  const [form, setForm] = useState<FormState>(() =>
    initialValues ? buildFormState(initialValues) : DEFAULT_FORM,
  )
  const [isPrivate, setIsPrivate] = useState(initialValues?.isGlobal === false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [aiNoticeVisible, setAiNoticeVisible] = useState(!!initialDraft)
  const [draftBannerVisible, setDraftBannerVisible] = useState(false)

  const { savedDraft, clearDraft } = useDraftPersistence(draftKey, form, !initialDraft)

  const { items: ingredientLibrary } = useAppSelector((s) => s.ingredients)

  // Restore saved draft on mount (only when not driven by an AI scan draft).
  useEffect(() => {
    if (!initialDraft && savedDraft) {
      setForm(savedDraft)
      setDraftBannerVisible(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply AI-scanned draft once on mount when provided.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialDraft) applyRecipeDraft(initialDraft) }, [])

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
    const tempKey = `draft-${idx}`
    const primaryId = form.ingredients[idx]?.alternativeFor === undefined ? tempKey : undefined
    patch(
      'ingredients',
      form.ingredients.filter(
        (r, i) => i !== idx && r.alternativeFor !== tempKey && r.alternativeFor !== primaryId,
      ),
    )
  }

  function addAlternativeRow(primaryIdx: number) {
    const tempKey = `draft-${primaryIdx}`
    const newAlt: RecipeIngredient = {
      ingredientId: '',
      quantity: form.ingredients[primaryIdx].quantity,
      unit: form.ingredients[primaryIdx].unit,
      alternativeFor: tempKey,
    }
    const updated = [...form.ingredients]
    let insertAt = primaryIdx + 1
    while (insertAt < updated.length && updated[insertAt].alternativeFor === tempKey) insertAt++
    updated.splice(insertAt, 0, newAlt)
    patch('ingredients', updated)
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
    const capitalised = name.trim().charAt(0).toUpperCase() + name.trim().slice(1)
    return handleCreateIngredient(capitalised)
  }

  /** Applies an AI-transcribed recipe draft to the form, resolving ingredients to the library. */
  async function applyRecipeDraft(draft: import('../../ai/types').RecipeDraft) {
    const resolved: RecipeIngredient[] = []
    for (const di of draft.ingredients) {
      const tempKey = `draft-${resolved.length}`
      const ingredientId = await resolveIngredientId(di.name)
      resolved.push({ ingredientId, quantity: di.quantity, unit: di.unit })

      for (const altName of di.alternatives ?? []) {
        const altIngredientId = await resolveIngredientId(altName)
        resolved.push({
          ingredientId: altIngredientId,
          quantity: di.quantity,
          unit: di.unit,
          alternativeFor: tempKey,
        })
      }
    }

    const validDietaryTags = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'] as const
    const validMealTags = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const
    const validSkillLevels = ['beginner', 'intermediate', 'advanced'] as const

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
      ...(draft.dietaryTags && {
        dietaryTags: draft.dietaryTags.filter((t): t is typeof validDietaryTags[number] =>
          (validDietaryTags as readonly string[]).includes(t),
        ),
      }),
      ...(draft.mealTags && {
        mealTags: draft.mealTags.filter((t): t is typeof validMealTags[number] =>
          (validMealTags as readonly string[]).includes(t),
        ),
      }),
      ...(draft.skillLevel && validSkillLevels.includes(draft.skillLevel as typeof validSkillLevels[number]) && {
        skillLevel: draft.skillLevel as typeof validSkillLevels[number],
      }),
      ...(draft.cuisineTypes?.length && { cuisineTypes: draft.cuisineTypes }),
      ...(draft.equipment?.length && { equipment: draft.equipment }),
      ...(draft.tags?.length && { tags: draft.tags }),
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
    clearDraft()
    if (onDone) {
      onDone()
    } else {
      router.push(isEdit ? (`/recipes/${initialValues!.id}` as any) : '/recipes' as any)
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
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
      isGlobal: !isPrivate,
      source: buildSource(),
      imageUrl: form.imageUrl.trim() || undefined,
    }

    try {
      if (isEdit) {
        await dispatch(updateRecipe({ id: initialValues.id, payload })).unwrap()
        clearDraft()
        router.push(`/recipes/${initialValues.id}` as any)
      } else {
        const result = await dispatch(createRecipe(payload)).unwrap()
        clearDraft()
        if (onDone) {
          onDone()
          router.push(`/recipes/${result.id}` as any)
        } else {
          router.push(`/recipes/${result.id}` as any)
        }
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  const unitOptions = COMMON_UNITS.map((u) => ({ value: u, label: localizeUnit(u, t) }))

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bg-dark" keyboardShouldPersistTaps="handled">
      <View className="p-4 gap-4">

        {/* Header (page mode only) */}
        {!onDone && (
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-app-text dark:text-text-dark">
              {isEdit ? t('recipes.editRecipe') : t('recipes.addRecipe')}
            </Text>
            <View className="flex-row gap-2">
              <Button variant="secondary" onPress={handleCancel}>{t('common.cancel')}</Button>
              <Button onPress={handleSubmit}>{t('common.save')}</Button>
            </View>
          </View>
        )}

        {/* Draft restore banner */}
        {draftBannerVisible && (
          <Alert variant="info">
            {t('common.draftRestored')}
            {'  '}
            <Button variant="secondary" onPress={() => { clearDraft(); setForm(DEFAULT_FORM); setDraftBannerVisible(false) }}>
              {t('common.discardDraft')}
            </Button>
          </Alert>
        )}

        {/* AI disclaimer */}
        {aiNoticeVisible && (
          <View className="flex-row items-center gap-2 bg-info-bg dark:bg-info-bg-dark rounded-lg p-3 border border-info-border dark:border-info-border-dark">
            <Info size={15} color="#3b82f6" />
            <Text className="flex-1 text-sm text-app-text dark:text-text-dark">
              <TranslatedText id="recipes.aiScanNotice" />
            </Text>
            <Pressable onPress={() => setAiNoticeVisible(false)} className="active:opacity-70">
              <X size={14} color="#6b7280" />
            </Pressable>
          </View>
        )}

        {submitError && <Alert variant="error">{submitError}</Alert>}

        {/* ─── Basic info ─────────────────────────────────────────────── */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.form.basics')}</Text>
            <RecipeScanButton onResult={applyRecipeDraft} onError={setSubmitError} />
          </View>
          <Input
            label={t('recipes.form.title')}
            value={form.title}
            onChangeText={(v) => patch('title', v)}
          />
          <Input
            label={t('recipes.form.description')}
            value={form.description}
            onChangeText={(v) => patch('description', v)}
            multiline
          />
          <Input
            label={t('recipes.imageUrl')}
            value={form.imageUrl}
            onChangeText={(v) => patch('imageUrl', v)}
            placeholder="https://…"
            keyboardType="url"
            autoCapitalize="none"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <NumberInput
                id="portions"
                label={t('recipes.portions')}
                value={form.portions}
                onChange={(v) => patch('portions', v)}
                min={1}
                max={100}
              />
            </View>
            <View className="flex-1">
              <NumberInput
                id="prepTime"
                label={`${t('recipes.prepTime')} (min)`}
                value={form.prepTimeMinutes}
                onChange={(v) => patch('prepTimeMinutes', v)}
                min={0}
                step={5}
              />
            </View>
            <View className="flex-1">
              <NumberInput
                id="cookTime"
                label={`${t('recipes.cookTime')} (min)`}
                value={form.cookTimeMinutes}
                onChange={(v) => patch('cookTimeMinutes', v)}
                min={0}
                step={5}
              />
            </View>
          </View>
          <Select
            label={t('recipes.skillLevel')}
            value={form.skillLevel}
            onChange={(v) => patch('skillLevel', v as SkillLevel)}
            options={SKILL_LEVELS.map((s) => ({ value: s, label: t(`recipes.skill.${s}`) }))}
          />
          <TagInput
            label={t('recipes.cuisineTypes')}
            tags={form.cuisineTypes}
            onChange={(v) => patch('cuisineTypes', v)}
            placeholder={t('recipes.form.addCuisine')}
          />
        </View>

        {/* ─── Source ─────────────────────────────────────────────────── */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.source.source')}</Text>
            <Checkbox
              label={t('recipes.form.addSource')}
              checked={form.sourceEnabled}
              onChange={(v) => patch('sourceEnabled', v)}
            />
          </View>
          {form.sourceEnabled && (
            <View className="gap-3">
              <Select
                label={t('recipes.source.type')}
                value={form.sourceType}
                onChange={(v) => patch('sourceType', v as RecipeSourceType)}
                options={SOURCE_TYPES.map((s) => ({ value: s, label: t(`recipes.sourceType.${s}`) }))}
              />
              <Input
                label={t('recipes.source.name')}
                value={form.sourceName}
                onChangeText={(v) => patch('sourceName', v)}
                placeholder={
                  form.sourceType === 'website' ? 'e.g. Serious Eats'
                    : form.sourceType === 'book' ? 'e.g. The Silver Spoon'
                      : 'e.g. Grandma Maria'
                }
              />
              {form.sourceType === 'website' && (
                <Input
                  label={t('recipes.source.url')}
                  value={form.sourceUrl}
                  onChangeText={(v) => patch('sourceUrl', v)}
                  placeholder="https://..."
                  keyboardType="url"
                  autoCapitalize="none"
                />
              )}
            </View>
          )}
        </View>

        {/* ─── Tags ───────────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.form.tags')}</Text>
          <View className="gap-1">
            <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('recipes.filters.dietary')}</Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {DIETARY_TAGS.map((tag) => (
                <Checkbox
                  key={tag}
                  label={tag}
                  checked={form.dietaryTags.includes(tag)}
                  onChange={() => toggleDietary(tag)}
                />
              ))}
            </View>
          </View>
          <View className="gap-1">
            <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('recipes.filters.mealType')}</Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {MEAL_TAGS.map((tag) => (
                <Checkbox
                  key={tag}
                  label={t(`recipes.mealTag.${tag}`)}
                  checked={form.mealTags.includes(tag)}
                  onChange={() => toggleMeal(tag)}
                />
              ))}
            </View>
          </View>
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
        </View>

        {/* ─── Ingredients ────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.ingredients')}</Text>
          {form.ingredients.map((row, idx) => {
            const isAlternative = Boolean(row.alternativeFor)
            const selectedIngredient = ingredientLibrary.find((i) => i.id === row.ingredientId)
            const products = selectedIngredient?.products ?? []
            const productOptions = [
              { value: '', label: t('recipes.form.defaultVariant') },
              ...products.map((p) => ({ value: p.id, label: `${p.name}${p.brand ? ` — ${p.brand}` : ''}` })),
            ]
            return (
              <View
                key={idx}
                className={`gap-2 p-3 rounded-xl border ${isAlternative ? 'border-dashed border-border dark:border-border-dark ml-4' : 'border-border dark:border-border-dark'} bg-surface dark:bg-surface-dark`}
              >
                {isAlternative && (
                  <Text className="text-xs font-bold text-accent dark:text-accent-dark">or</Text>
                )}
                <View className="flex-row items-center gap-2">
                  <View className="flex-1">
                    <IngredientCombobox
                      value={row.ingredientId || undefined}
                      onChange={(id) => updateIngredientRow(idx, { ingredientId: id, productId: undefined })}
                      options={ingredientLibrary}
                      onCreateNew={handleCreateIngredient}
                      placeholder={t('recipes.form.selectIngredient')}
                    />
                  </View>
                  <Pressable onPress={() => removeIngredientRow(idx)} className="p-2 active:opacity-70">
                    <Trash2 size={16} color="#ef4444" />
                  </Pressable>
                </View>
                <View className="flex-row gap-2 items-center">
                  <View className="w-24">
                    <NumberInput
                      value={row.quantity}
                      onChange={(v) => updateIngredientRow(idx, { quantity: v })}
                      min={0.01}
                      step="any"
                    />
                  </View>
                  <View className="flex-1">
                    <Select
                      value={row.unit}
                      onChange={(v) => updateIngredientRow(idx, { unit: v })}
                      options={unitOptions}
                    />
                  </View>
                </View>
                {products.length > 0 && (
                  <Select
                    value={row.productId ?? ''}
                    onChange={(v) => updateIngredientRow(idx, { productId: v || undefined })}
                    options={productOptions}
                  />
                )}
                {!isAlternative && (
                  <Button variant="secondary" onPress={() => addAlternativeRow(idx)}>
                    <Text className="text-app-text dark:text-text-dark text-sm">or</Text>
                  </Button>
                )}
              </View>
            )
          })}
          <Button variant="secondary" onPress={addIngredientRow}>
            <Plus size={16} color="#6b7280" />
            <Text className="text-app-text dark:text-text-dark">{t('recipes.form.addIngredient')}</Text>
          </Button>
        </View>

        {/* ─── Instructions ───────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.instructions')}</Text>
          {form.steps.map((step, idx) => (
            <View key={idx} className="gap-2 bg-surface dark:bg-surface-dark rounded-xl p-3 border border-border dark:border-border-dark">
              <View className="flex-row items-center justify-between">
                <View className="w-6 h-6 rounded-full bg-accent dark:bg-accent-dark items-center justify-center">
                  <Text className="text-xs font-bold text-accent-contrast">{idx + 1}</Text>
                </View>
                {form.steps.length > 1 && (
                  <Pressable onPress={() => removeStep(idx)} className="p-1 active:opacity-70">
                    <X size={16} color="#6b7280" />
                  </Pressable>
                )}
              </View>
              <InlineEdit
                multiline
                value={step.description}
                onChange={(v) => updateStep(idx, { description: v })}
                placeholder={t('recipes.form.stepDescription')}
              />
              <NumberInput
                value={step.timerMinutes ?? 0}
                onChange={(v) => updateStep(idx, { timerMinutes: v || undefined })}
                min={0}
                step={1}
                label={`${t('recipes.form.timer')} (min, 0 = none)`}
              />
            </View>
          ))}
          <Button variant="secondary" onPress={addStep}>
            <Plus size={16} color="#6b7280" />
            <Text className="text-app-text dark:text-text-dark">{t('recipes.form.addStep')}</Text>
          </Button>
        </View>

        {/* ─── Notes ──────────────────────────────────────────────────── */}
        <View className="gap-1">
          <Text className="text-lg font-semibold text-app-text dark:text-text-dark">{t('recipes.notes')}</Text>
          <Input
            value={form.notes}
            onChangeText={(v) => patch('notes', v)}
            multiline
            placeholder={t('recipes.form.notesPlaceholder')}
          />
        </View>

        {/* ─── Private toggle ─────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-app-text dark:text-text-dark">{t('common.makePrivate')}</Text>
          <Switch value={isPrivate} onValueChange={setIsPrivate} />
        </View>

        {/* ─── Modal-mode footer ───────────────────────────────────────── */}
        {onDone && (
          <View className="flex-row gap-2 pt-2">
            <Button variant="secondary" onPress={handleCancel}>{t('common.cancel')}</Button>
            <Button onPress={handleSubmit}>{t('common.save')}</Button>
          </View>
        )}

      </View>
    </ScrollView>
  )
}
