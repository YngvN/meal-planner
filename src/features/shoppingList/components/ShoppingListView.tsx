import { useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, SectionList, Alert as RNAlert } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowRight, X } from 'lucide-react-native'
import { Badge, Button, Checkbox } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import type { IngredientCategory } from '../../ingredients/types'
import type { PantryItem } from '../../pantry/types'
import { updatePantryItem } from '../../pantry/pantrySlice'
import type { PlannedMeal } from '../../mealPlan/types'
import type { Recipe } from '../../recipes/types'
import { useLanguage } from '../../../i18n'
import { localizedIngredientName } from '../../shared/localize'
import {
  addManualItem,
  clearAll,
  removeManualItem,
  toggleIngredientChecked,
  toggleManualItemChecked,
  uncheckAll,
} from '../shoppingListSlice'
import type { DerivedShoppingItem } from '../types'

/** Category display order for grouping. */
const CATEGORY_ORDER: IngredientCategory[] = [
  'produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'beverages', 'pantry', 'other',
]

/**
 * Aggregates recipe ingredients from all planned meals into a shopping list,
 * accounting for portion scaling and excluding pantry in-stock items.
 */
function buildDerivedItems(
  plannedMeals: PlannedMeal[],
  recipes: Recipe[],
  pantryItems: PantryItem[],
): DerivedShoppingItem[] {
  const agg = new Map<string, DerivedShoppingItem>()

  for (const meal of plannedMeals) {
    const recipe = recipes.find((r) => r.id === meal.recipeId)
    if (!recipe) continue
    const scale = (meal.portions ?? recipe.portions) / recipe.portions

    for (const ri of recipe.ingredients) {
      const pantryItem = pantryItems.find((p) => p.ingredientId === ri.ingredientId)
      if (pantryItem?.inStock) continue

      const key = `${ri.ingredientId}::${ri.unit}`
      const existing = agg.get(key)
      if (existing) {
        existing.quantity += ri.quantity * scale
        if (!existing.recipeIds.includes(recipe.id)) existing.recipeIds.push(recipe.id)
      } else {
        agg.set(key, {
          ingredientId: ri.ingredientId,
          quantity: ri.quantity * scale,
          unit: ri.unit,
          recipeIds: [recipe.id],
        })
      }
    }
  }

  return Array.from(agg.values())
}

/**
 * Full shopping list UI. Derives items from the meal plan, groups by category,
 * lets users check off items (auto-updating pantry), and add manual items.
 */
export function ShoppingListView() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { t, language } = useLanguage()

  const plannedMeals = useAppSelector((s) => s.mealPlan.items)
  const recipes = useAppSelector((s) => s.recipes.items)
  const ingredients = useAppSelector((s) => s.ingredients.items)
  const pantryItems = useAppSelector((s) => s.pantry.items)
  const checkedIds = useAppSelector((s) => s.shoppingList.checkedIngredientIds)
  const manualItems = useAppSelector((s) => s.shoppingList.manualItems)

  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')

  const ingredientMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients])
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  const derived = useMemo(
    () => buildDerivedItems(plannedMeals, recipes, pantryItems),
    [plannedMeals, recipes, pantryItems],
  )

  // Group derived items by ingredient category
  const sections = useMemo(() => {
    const map = new Map<IngredientCategory, DerivedShoppingItem[]>()
    for (const item of derived) {
      const ing = ingredientMap.get(item.ingredientId)
      const cat: IngredientCategory = ing?.category ?? 'other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    const grouped = CATEGORY_ORDER.flatMap((cat) => {
      const items = map.get(cat)
      return items ? [{ title: cat, data: items }] : []
    })
    // Add manual items as a final section
    return [
      ...grouped,
      { title: '__manual__', data: [] as DerivedShoppingItem[] },
    ]
  }, [derived, ingredientMap])

  const checkedCount = checkedIds.length + manualItems.filter((m) => m.checked).length
  const totalCount = derived.length + manualItems.length

  function handleCheck(ingredientId: string) {
    dispatch(toggleIngredientChecked(ingredientId))
  }

  function handleMarkPurchased() {
    for (const id of checkedIds) {
      dispatch(updatePantryItem({ ingredientId: id, payload: { inStock: true } }))
    }
    dispatch(uncheckAll())
  }

  function handleAddManual() {
    const name = newItemName.trim()
    if (!name) return
    dispatch(addManualItem({ name, quantity: newItemQty.trim(), checked: false }))
    setNewItemName('')
    setNewItemQty('')
  }

  function handleClearAll() {
    RNAlert.alert(
      t('shoppingList.confirmClear'),
      undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => dispatch(clearAll()) },
      ],
    )
  }

  if (plannedMeals.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 p-8">
        <Text className="text-text-muted dark:text-text-muted-dark text-center">{t('shoppingList.empty')}</Text>
        <Button onPress={() => router.push('/meal-plan' as any)}>
          {t('nav.mealPlan')}
          <ArrowRight size={16} color="#ffffff" />
        </Button>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      {/* Summary bar */}
      <View className="px-4 py-3 flex-row items-center justify-between gap-2 border-b border-border dark:border-border-dark">
        <Text className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('shoppingList.generated', { count: String(derived.length) })}
        </Text>
        <View className="flex-row gap-2">
          {checkedIds.length > 0 && (
            <Button onPress={handleMarkPurchased}>
              {t('shoppingList.updatePantry')} ({checkedIds.length})
            </Button>
          )}
          {totalCount > 0 && (
            <Button variant="secondary" onPress={handleClearAll}>
              {t('shoppingList.clearAll')}
            </Button>
          )}
        </View>
      </View>

      {checkedCount === totalCount && totalCount > 0 && (
        <View className="px-4 py-2">
          <Badge variant="success">{t('shoppingList.allChecked')}</Badge>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.ingredientId}::${item.unit}::${index}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        renderSectionHeader={({ section }) => (
          <Text className="text-sm font-semibold text-text-muted dark:text-text-muted-dark py-2 mt-3 uppercase tracking-wide">
            {section.title === '__manual__'
              ? t('shoppingList.manualSection')
              : t(`ingredients.categories.${section.title}`)}
          </Text>
        )}
        renderItem={({ item }) => {
          const ing = ingredientMap.get(item.ingredientId)
          const checked = checkedIds.includes(item.ingredientId)
          const recipeNames = item.recipeIds
            .map((id) => {
              const r = recipeMap.get(id)
              return r ? r.titleI18n?.[language] || r.title : undefined
            })
            .filter(Boolean)
            .join(', ')

          return (
            <View className={`flex-row items-center gap-3 py-3 border-b border-border dark:border-border-dark ${checked ? 'opacity-50' : ''}`}>
              <Checkbox
                label=""
                checked={checked}
                onChange={() => handleCheck(item.ingredientId)}
              />
              <View className="flex-1">
                <Text className={`text-base text-app-text dark:text-text-dark ${checked ? 'line-through' : ''}`}>
                  {ing ? localizedIngredientName(ing, language) : item.ingredientId}
                </Text>
                {recipeNames ? (
                  <Text className="text-xs text-text-muted dark:text-text-muted-dark">{recipeNames}</Text>
                ) : null}
              </View>
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                {Math.round(item.quantity * 10) / 10} {item.unit}
              </Text>
            </View>
          )
        }}
        ListFooterComponent={
          <View className="gap-3 mt-2">
            {/* Manual items */}
            {manualItems.map((item) => (
              <View key={item.id} className={`flex-row items-center gap-3 py-3 border-b border-border dark:border-border-dark ${item.checked ? 'opacity-50' : ''}`}>
                <Checkbox
                  label=""
                  checked={item.checked}
                  onChange={() => dispatch(toggleManualItemChecked(item.id))}
                />
                <Text className={`flex-1 text-base text-app-text dark:text-text-dark ${item.checked ? 'line-through' : ''}`}>
                  {item.name}
                </Text>
                {item.quantity ? (
                  <Text className="text-sm text-text-muted dark:text-text-muted-dark">{item.quantity}</Text>
                ) : null}
                <Pressable onPress={() => dispatch(removeManualItem(item.id))} className="p-1 active:opacity-70">
                  <X size={16} color="#6b7280" />
                </Pressable>
              </View>
            ))}

            {/* Add manual item form */}
            <View className="flex-row gap-2 items-center mt-2">
              <TextInput
                className="flex-1 border border-border dark:border-border-dark rounded-lg px-3 py-2 text-base text-app-text dark:text-text-dark bg-bg dark:bg-bg-dark"
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder={t('shoppingList.addItemPlaceholder')}
                placeholderTextColor="#6b6375"
                onSubmitEditing={handleAddManual}
                returnKeyType="done"
              />
              <TextInput
                className="w-20 border border-border dark:border-border-dark rounded-lg px-3 py-2 text-base text-app-text dark:text-text-dark bg-bg dark:bg-bg-dark"
                value={newItemQty}
                onChangeText={setNewItemQty}
                placeholder={t('shoppingList.qtyPlaceholder')}
                placeholderTextColor="#6b6375"
                onSubmitEditing={handleAddManual}
                returnKeyType="done"
              />
              <Button onPress={handleAddManual} disabled={!newItemName.trim()}>
                {t('shoppingList.addItem')}
              </Button>
            </View>
          </View>
        }
      />
    </View>
  )
}
