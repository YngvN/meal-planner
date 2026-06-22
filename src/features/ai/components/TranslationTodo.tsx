import { useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { ArrowRight, LoaderCircle } from 'lucide-react-native'
import { Badge, Button } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { availableLanguages, useLanguage } from '../../../i18n'
import { updateIngredient } from '../../ingredients/ingredientsSlice'
import { updateRecipe } from '../../recipes/recipesSlice'
import { ingredientMissingLanguages, recipeMissingLanguages } from '../../shared/localize'
import type { Ingredient } from '../../ingredients/types'
import type { Recipe } from '../../recipes/types'
import { translateFields } from '../aiApi'

/** All configured language codes (e.g. ['en', 'no']). */
const ALL_LANGS = availableLanguages.map((l) => l.code)

/** Max items to show so the widget stays scannable. */
const MAX_ROWS = 10

type TranslatableRow =
  | { kind: 'ingredient'; id: string; name: string; item: Ingredient }
  | { kind: 'recipe'; id: string; name: string; item: Recipe }

/**
 * Home dashboard widget listing ingredients and recipes that are missing
 * translations for one or more configured languages. Each can be translated
 * via the AI endpoint with one click, or all at once.
 */
export function TranslationTodo() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()

  const ingredients = useAppSelector((s) => s.ingredients.items)
  const recipes = useAppSelector((s) => s.recipes.items)

  const [busy, setBusy] = useState<Set<string>>(new Set())

  const rows = useMemo<TranslatableRow[]>(() => {
    const ingredientRows: TranslatableRow[] = ingredients
      .filter((ing) => ingredientMissingLanguages(ing, ALL_LANGS).length > 0)
      .map((ing) => ({ kind: 'ingredient', id: ing.id, name: ing.name, item: ing }))

    const recipeRows: TranslatableRow[] = recipes
      .filter((r) => recipeMissingLanguages(r, ALL_LANGS).length > 0)
      .map((r) => ({ kind: 'recipe', id: r.id, name: r.title, item: r }))

    return [...ingredientRows, ...recipeRows]
  }, [ingredients, recipes])

  const visibleRows = rows.slice(0, MAX_ROWS)

  function setBusyFor(key: string, value: boolean) {
    setBusy((prev) => {
      const next = new Set(prev)
      if (value) next.add(key)
      else next.delete(key)
      return next
    })
  }

  async function translateIngredient(ing: Ingredient) {
    const { translations } = await translateFields({
      fields: { name: ing.name },
      targetLanguages: ALL_LANGS,
    })
    const nameI18n: Record<string, string> = { ...ing.nameI18n }
    for (const [lang, payload] of Object.entries(translations)) {
      if (payload.fields.name) nameI18n[lang] = payload.fields.name
    }
    await dispatch(updateIngredient({ id: ing.id, payload: { nameI18n } }))
  }

  async function translateRecipe(recipe: Recipe) {
    const orderedSteps = recipe.instructions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => s.description)

    const { translations } = await translateFields({
      fields: {
        title: recipe.title,
        description: recipe.description,
        ...(recipe.notes ? { notes: recipe.notes } : {}),
      },
      arrayFields: { instructions: orderedSteps },
      targetLanguages: ALL_LANGS,
    })

    const titleI18n: Record<string, string> = { ...recipe.titleI18n }
    const descriptionI18n: Record<string, string> = { ...recipe.descriptionI18n }
    const notesI18n: Record<string, string> = { ...recipe.notesI18n }
    const instructionsI18n: Record<string, string[]> = { ...recipe.instructionsI18n }

    for (const [lang, payload] of Object.entries(translations)) {
      if (payload.fields.title) titleI18n[lang] = payload.fields.title
      if (payload.fields.description) descriptionI18n[lang] = payload.fields.description
      if (payload.fields.notes) notesI18n[lang] = payload.fields.notes
      if (payload.arrayFields?.instructions) instructionsI18n[lang] = payload.arrayFields.instructions
    }

    await dispatch(
      updateRecipe({
        id: recipe.id,
        payload: { titleI18n, descriptionI18n, notesI18n, instructionsI18n },
      }),
    )
  }

  async function translateRow(row: TranslatableRow) {
    setBusyFor(row.id, true)
    try {
      if (row.kind === 'ingredient') await translateIngredient(row.item)
      else await translateRecipe(row.item)
    } finally {
      setBusyFor(row.id, false)
    }
  }

  async function translateAll() {
    for (const row of visibleRows) {
      await translateRow(row)
    }
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-app-text dark:text-text-dark">
          {t('home.needsTranslation')}
        </Text>
        {visibleRows.length > 0 && (
          <Button variant="secondary" onPress={translateAll} disabled={busy.size > 0}>
            {t('home.translateAll')}
          </Button>
        )}
      </View>

      {rows.length === 0 ? (
        <Badge variant="success">{t('home.allTranslated')}</Badge>
      ) : (
        <View className="gap-2">
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            {t('home.itemsNeedTranslation', { count: String(rows.length) })}
          </Text>
          {visibleRows.map((row) => (
            <View key={`${row.kind}-${row.id}`} className="flex-row items-center gap-2 py-2 border-b border-border dark:border-border-dark">
              <Badge variant="neutral">{t(`nav.${row.kind === 'ingredient' ? 'ingredients' : 'recipes'}`)}</Badge>
              <Text className="flex-1 text-sm text-app-text dark:text-text-dark" numberOfLines={1}>
                {row.name}
              </Text>
              <Pressable
                onPress={() => translateRow(row)}
                disabled={busy.has(row.id)}
                className="flex-row items-center gap-1 active:opacity-70"
              >
                {busy.has(row.id) ? (
                  <>
                    <LoaderCircle size={14} color="#7c3aed" />
                    <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('ai.translating')}</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-xs text-accent dark:text-accent-dark">{t('home.translate')}</Text>
                    <ArrowRight size={14} color="#7c3aed" />
                  </>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
