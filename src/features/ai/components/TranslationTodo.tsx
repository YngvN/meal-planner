import { useMemo, useState } from 'react'
import { Badge, Button } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
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

  // Track which rows are currently being translated.
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
    <section className="home__section">
      <div className="home__section-header">
        <h2 className="home__section-title">{t('home.needsTranslation')}</h2>
        {visibleRows.length > 0 && (
          <Button variant="secondary" onClick={translateAll} disabled={busy.size > 0}>
            {t('home.translateAll')}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="home__all-fresh">
          <Badge variant="success">{t('home.allTranslated')}</Badge>
        </p>
      ) : (
        <>
          <p className="home__todo-count">
            {t('home.itemsNeedTranslation', { count: String(rows.length) })}
          </p>
          <ul className="home__todo-list">
            {visibleRows.map((row) => (
              <li key={`${row.kind}-${row.id}`} className="home__todo-item">
                <Badge variant="neutral">{t(`nav.${row.kind === 'ingredient' ? 'ingredients' : 'recipes'}`)}</Badge>
                <span className="home__todo-name">{row.name}</span>
                <span className="home__todo-missing" />
                <button
                  type="button"
                  className="home__expiry-link"
                  onClick={() => translateRow(row)}
                  disabled={busy.has(row.id)}
                >
                  {busy.has(row.id) ? `⏳ ${t('ai.translating')}` : `${t('home.translate')} →`}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
