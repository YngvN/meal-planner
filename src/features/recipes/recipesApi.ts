import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { CreateRecipePayload, Recipe, RecipeIngredient, UpdateRecipePayload } from './types'

const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true'

apiLog('recipes', `module loaded · mode=${useMock ? 'MOCK' : 'Supabase'}`)

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapRecipeIngredient(row: Record<string, unknown>): RecipeIngredient {
  return {
    ingredientId: row.ingredient_id as string,
    quantity: row.quantity as number,
    unit: row.unit as string,
    productId: (row.product_id as string) ?? undefined,
  }
}

function mapRecipe(row: Record<string, unknown>): Recipe {
  const ingredients = Array.isArray(row.recipe_ingredients)
    ? (row.recipe_ingredients as Record<string, unknown>[])
        .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0))
        .map(mapRecipeIngredient)
    : []

  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    instructions: (row.instructions as Recipe['instructions']) ?? [],
    portions: row.portions as number,
    prepTimeMinutes: row.prep_time_minutes as number,
    cookTimeMinutes: row.cook_time_minutes as number,
    skillLevel: row.skill_level as Recipe['skillLevel'],
    cuisineTypes: (row.cuisine_types as string[]) ?? [],
    dietaryTags: (row.dietary_tags as Recipe['dietaryTags']) ?? [],
    seasonalTags: (row.seasonal_tags as Recipe['seasonalTags']) ?? [],
    mealTags: (row.meal_tags as Recipe['mealTags']) ?? [],
    tags: (row.tags as string[]) ?? [],
    equipment: (row.equipment as string[]) ?? [],
    nutrition: (row.nutrition as Recipe['nutrition']) ?? undefined,
    costEstimate: (row.cost_estimate as number) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    source: (row.source as Recipe['source']) ?? undefined,
    isFavorite: (row.is_favorite as boolean) ?? false,
    isGlobal: (row.is_global as boolean) ?? true,
    userId: (row.user_id as string) ?? undefined,
    createdByUsername: (row.created_by_username as string) ?? undefined,
    imageUrl: (row.image_url as string) ?? undefined,
    titleI18n: (row.title_i18n as Record<string, string>) ?? {},
    descriptionI18n: (row.description_i18n as Record<string, string>) ?? {},
    notesI18n: (row.notes_i18n as Record<string, string>) ?? {},
    instructionsI18n: (row.instructions_i18n as Record<string, string[]>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    ingredients,
  }
}

function recipeToDb(payload: Partial<CreateRecipePayload>) {
  return {
    ...(payload.title !== undefined && { title: payload.title }),
    description: payload.description ?? '',
    portions: payload.portions,
    prep_time_minutes: payload.prepTimeMinutes,
    cook_time_minutes: payload.cookTimeMinutes,
    skill_level: payload.skillLevel,
    cuisine_types: payload.cuisineTypes ?? [],
    dietary_tags: payload.dietaryTags ?? [],
    seasonal_tags: payload.seasonalTags ?? [],
    meal_tags: payload.mealTags ?? [],
    tags: payload.tags ?? [],
    equipment: payload.equipment ?? [],
    instructions: payload.instructions ?? [],
    nutrition: payload.nutrition ?? null,
    cost_estimate: payload.costEstimate ?? null,
    notes: payload.notes ?? null,
    source: payload.source ?? null,
    is_favorite: payload.isFavorite ?? false,
    is_global: payload.isGlobal ?? true,
    image_url: payload.imageUrl ?? null,
    title_i18n: payload.titleI18n ?? {},
    description_i18n: payload.descriptionI18n ?? {},
    notes_i18n: payload.notesI18n ?? {},
    instructions_i18n: payload.instructionsI18n ?? {},
  }
}

const RECIPE_SELECT = '*, recipe_ingredients(*)'

async function fetchById(id: string): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .eq('id', id)
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Recipe not found')
  return mapRecipe(data as Record<string, unknown>)
}

async function upsertIngredients(recipeId: string, ingredients: RecipeIngredient[]) {
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
  if (!ingredients.length) return
  const { error } = await supabase.from('recipe_ingredients').insert(
    ingredients.map((ri, i) => ({
      recipe_id: recipeId,
      ingredient_id: ri.ingredientId,
      product_id: ri.productId ?? null,
      quantity: ri.quantity,
      unit: ri.unit,
      position: i,
    })),
  )
  if (error) throw new Error(error.message)
}

// ─── API functions ─────────────────────────────────────────────────────────────

export async function fetchRecipes(): Promise<Recipe[]> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.fetchRecipes()
  }
  apiLog('recipes', 'fetchRecipes → Supabase')
  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_SELECT)
    .order('title')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapRecipe(r as Record<string, unknown>))
}

export async function fetchRecipeById(id: string): Promise<Recipe> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.fetchRecipeById(id)
  }
  apiLog('recipes', `fetchRecipeById → Supabase id=${id}`)
  return fetchById(id)
}

export async function createRecipe(payload: CreateRecipePayload): Promise<Recipe> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.createRecipe(payload)
  }
  apiLog('recipes', 'createRecipe → Supabase', payload.title)
  const { data: { user } } = await supabase.auth.getUser()
  // Fetch the creator's username for attribution on recipe cards.
  let createdByUsername: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    createdByUsername = (profile as Record<string, unknown> | null)?.username as string | undefined
  }
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      ...recipeToDb(payload),
      ...(user && { user_id: user.id }),
      ...(createdByUsername && { created_by_username: createdByUsername }),
    })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create recipe')
  const id = (data as Record<string, unknown>).id as string
  await upsertIngredients(id, payload.ingredients ?? [])
  return fetchById(id)
}

export async function updateRecipe(id: string, payload: UpdateRecipePayload): Promise<Recipe> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.updateRecipe(id, payload)
  }
  apiLog('recipes', `updateRecipe → Supabase id=${id}`)
  const { error } = await supabase.from('recipes').update(recipeToDb(payload)).eq('id', id)
  if (error) throw new Error(error.message)
  if (payload.ingredients !== undefined) {
    await upsertIngredients(id, payload.ingredients)
  }
  return fetchById(id)
}

export async function deleteRecipe(id: string): Promise<void> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.deleteRecipe(id)
  }
  apiLog('recipes', `deleteRecipe → Supabase id=${id}`)
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function toggleFavorite(id: string): Promise<Recipe> {
  if (useMock) {
    const mock = await import('../../mocks/mockApi')
    return mock.toggleFavorite(id)
  }
  apiLog('recipes', `toggleFavorite → Supabase id=${id}`)
  const current = await fetchById(id)
  const { error } = await supabase
    .from('recipes')
    .update({ is_favorite: !current.isFavorite })
    .eq('id', id)
  if (error) throw new Error(error.message)
  return fetchById(id)
}
