import type { IngredientCategory } from './types'

/**
 * Keyword rules for mapping OFF `categories_tags` to our IngredientCategory enum.
 * Rules are checked in order; first match wins.
 */
const RULES: Array<{ keywords: string[]; category: IngredientCategory }> = [
  { keywords: ['dairy', 'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'fromage', 'lactos'], category: 'dairy' },
  { keywords: ['meat', 'beef', 'pork', 'chicken', 'poultry', 'lamb', 'veal', 'turkey', 'ham', 'sausage', 'deli'], category: 'meat' },
  { keywords: ['fish', 'seafood', 'shellfish', 'shrimp', 'salmon', 'tuna', 'cod', 'prawn', 'lobster', 'crab', 'mussel'], category: 'seafood' },
  { keywords: ['frozen'], category: 'frozen' },
  { keywords: ['bread', 'bakery', 'biscuit', 'pastry', 'cereal', 'cake', 'cookie', 'cracker', 'muffin', 'waffle', 'tortilla', 'bagel'], category: 'bakery' },
  { keywords: ['beverage', 'drink', 'juice', 'water', 'soda', 'beer', 'wine', 'coffee', 'tea', 'smoothie', 'lemonade', 'cola', 'sport'], category: 'beverages' },
  { keywords: ['fruit', 'vegetable', 'produce', 'salad', 'herb', 'fresh', 'berry', 'berries', 'apple', 'banana', 'tomato', 'carrot', 'potato', 'onion', 'broccoli', 'spinach', 'lettuce', 'mushroom', 'avocado', 'pepper'], category: 'produce' },
]

/**
 * Maps an OFF `categories_tags` array (e.g. `["en:condiments","en:ketchups"]`)
 * to one of our IngredientCategory values.
 * Falls back to 'pantry' when no keyword matches.
 */
export function offCategoryToIngredientCategory(
  categoryTags: string[],
): IngredientCategory {
  const joined = categoryTags.join(' ').toLowerCase()
  for (const { keywords, category } of RULES) {
    if (keywords.some((kw) => joined.includes(kw))) {
      return category
    }
  }
  return 'pantry'
}

/**
 * Tags whose text (after prefix stripping) starts with these strings are
 * internal OFF identifiers that are not meaningful as user-facing labels.
 */
const LABEL_BLOCKLIST = [
  'recipe',
  'for-',
  'in-',
  'with-',
  'without-',
  'contains-',
  'no-',
  'non-',
  'not-',
]

/**
 * Normalises an OFF label tag (e.g. `"en:organic"`) to a display-friendly
 * string (e.g. `"Organic"`).  Returns null for tags that are too generic,
 * contain dots (internal identifiers), or match the blocklist.
 */
export function normalizeOffLabel(tag: string): string | null {
  // Strip language prefix (e.g. "en:", "fr:", "de:")
  const bare = tag.replace(/^[a-z]{2}:/, '')
  // Tags with dots are internal OFF identifiers (e.g. "recipe.x") — skip them
  if (bare.includes('.')) return null
  // Convert hyphens to spaces for display
  const clean = bare.replace(/-/g, ' ')
  // Skip very short or purely numeric results
  if (clean.length < 3 || /^\d/.test(clean)) return null
  // Skip blocklisted prefixes — these are technical/process tags, not consumer labels
  if (LABEL_BLOCKLIST.some((prefix) => bare.startsWith(prefix))) return null
  // Title-case
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}
