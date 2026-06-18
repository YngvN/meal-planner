import type { Ingredient, SubProduct } from '../ingredients/types'
import type { Recipe } from '../recipes/types'

/**
 * Pure localization helpers. Each returns the translated value for the given
 * language code when present, falling back to the original user-entered value.
 */

/** Returns the ingredient name in the given language, or the original name. */
export function localizedIngredientName(ing: Ingredient, lang: string): string {
  return ing.nameI18n?.[lang]?.trim() || ing.name
}

/** Returns the subproduct name in the given language, or the original name. */
export function localizedSubproductName(sp: SubProduct, lang: string): string {
  return sp.nameI18n?.[lang]?.trim() || sp.name
}

/**
 * Returns a shallow copy of the recipe with title, description, notes, and
 * instruction step descriptions localized to the given language where available.
 * Untranslated fields keep their original values.
 */
export function localizeRecipe(recipe: Recipe, lang: string): Recipe {
  const instructionsI18n = recipe.instructionsI18n?.[lang]

  return {
    ...recipe,
    title: recipe.titleI18n?.[lang]?.trim() || recipe.title,
    description: recipe.descriptionI18n?.[lang]?.trim() || recipe.description,
    notes: recipe.notesI18n?.[lang]?.trim() || recipe.notes,
    instructions: instructionsI18n
      ? recipe.instructions.map((step, i) => ({
          ...step,
          description: instructionsI18n[i]?.trim() || step.description,
        }))
      : recipe.instructions,
  }
}

/**
 * Returns the language codes (from the full set) for which an ingredient is
 * missing a translation. Used to decide whether it needs translating.
 */
export function ingredientMissingLanguages(ing: Ingredient, langs: string[]): string[] {
  return langs.filter((l) => !ing.nameI18n?.[l]?.trim())
}

/**
 * Returns the language codes for which a recipe is missing a title translation.
 */
export function recipeMissingLanguages(recipe: Recipe, langs: string[]): string[] {
  return langs.filter((l) => !recipe.titleI18n?.[l]?.trim())
}
