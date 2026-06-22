import { useState } from 'react'
import { View, Text, Switch } from 'react-native'
import { Image } from 'expo-image'
import { Alert, Button, Input, NumberInput, Select } from '../../../components'
import { useAppDispatch } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { createIngredient, updateIngredient } from '../ingredientsSlice'
import { NutritionScanButton } from '../../ai/components/NutritionScanButton'
import type { Ingredient, IngredientCategory } from '../types'

const CATEGORIES: IngredientCategory[] = [
  'produce', 'dairy', 'meat', 'seafood', 'pantry', 'frozen', 'bakery', 'beverages', 'other',
]

interface IngredientFormProps {
  /** Provide to switch to edit mode. */
  ingredient?: Ingredient
  onDone: () => void
}

/**
 * Form for creating or editing a global ingredient.
 * Includes nutrition per 100g, default shelf life, and named subproduct variants.
 */
export function IngredientForm({ ingredient, onDone }: IngredientFormProps) {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const isEdit = !!ingredient

  const [name, setName] = useState(ingredient?.name ?? '')
  const [category, setCategory] = useState<IngredientCategory>(ingredient?.category ?? 'other')
  const [defaultExpiryDays, setDefaultExpiryDays] = useState(ingredient?.defaultExpiryDays ?? 0)
  const [imageUrl, setImageUrl] = useState(ingredient?.imageUrl ?? '')
  const [density, setDensity] = useState<string>(String(ingredient?.density ?? ''))
  const [isPrivate, setIsPrivate] = useState(ingredient?.isGlobal === false)

  // Nutrition per 100g
  const [calories, setCalories] = useState<string>(String(ingredient?.nutrition?.calories ?? ''))
  const [protein, setProtein] = useState<string>(String(ingredient?.nutrition?.protein ?? ''))
  const [carbs, setCarbs] = useState<string>(String(ingredient?.nutrition?.carbs ?? ''))
  const [fat, setFat] = useState<string>(String(ingredient?.nutrition?.fat ?? ''))
  const [fiber, setFiber] = useState<string>(String(ingredient?.nutrition?.fiber ?? ''))

  const [error, setError] = useState<string | null>(null)

  function parseOptionalNumber(val: string): number | undefined {
    const n = parseFloat(val)
    return isNaN(n) ? undefined : n
  }

  async function handleSubmit() {
    setError(null)

    if (!name.trim()) {
      setError(t('ingredients.form.nameRequired'))
      return
    }

    const nutritionPayload = {
      calories: parseOptionalNumber(calories),
      protein: parseOptionalNumber(protein),
      carbs: parseOptionalNumber(carbs),
      fat: parseOptionalNumber(fat),
      fiber: parseOptionalNumber(fiber),
    }
    const hasNutrition = Object.values(nutritionPayload).some((v) => v !== undefined)

    const payload = {
      name: name.trim(),
      category,
      defaultExpiryDays: defaultExpiryDays > 0 ? defaultExpiryDays : undefined,
      nutrition: hasNutrition ? nutritionPayload : undefined,
      imageUrl: imageUrl.trim() || undefined,
      density: parseOptionalNumber(density),
      isGlobal: !isPrivate,
    }

    try {
      if (isEdit) {
        await dispatch(updateIngredient({ id: ingredient.id, payload })).unwrap()
      } else {
        await dispatch(createIngredient(payload)).unwrap()
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    }
  }

  return (
    <View className="gap-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        label={t('ingredients.name')}
        value={name}
        onChangeText={setName}
      />

      <Select
        label={t('ingredients.category')}
        value={category}
        onChange={(v) => setCategory(v as IngredientCategory)}
        options={CATEGORIES.map((c) => ({ value: c, label: t(`ingredients.categories.${c}`) }))}
      />

      <Input
        label={t('ingredients.imageUrl')}
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="https://…"
        keyboardType="url"
        autoCapitalize="none"
      />

      {imageUrl.trim() && (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 80, height: 80, borderRadius: 8, alignSelf: 'center' }}
          contentFit="contain"
        />
      )}

      <NumberInput
        label={t('ingredients.defaultExpiryDays')}
        value={defaultExpiryDays}
        onChange={setDefaultExpiryDays}
        min={0}
        step={1}
      />
      {defaultExpiryDays === 0 ? (
        <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('ingredients.noDefaultExpiry')}</Text>
      ) : (
        <Text className="text-xs text-text-muted dark:text-text-muted-dark">{defaultExpiryDays} days</Text>
      )}

      {/* Nutrition per 100g */}
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-app-text dark:text-text-dark">
            {t('ingredients.nutrition')}
          </Text>
          <NutritionScanButton
            onResult={(n) => {
              if (n.calories !== undefined) setCalories(String(n.calories))
              if (n.protein !== undefined) setProtein(String(n.protein))
              if (n.carbs !== undefined) setCarbs(String(n.carbs))
              if (n.fat !== undefined) setFat(String(n.fat))
              if (n.fiber !== undefined) setFiber(String(n.fiber))
            }}
            onError={(msg) => setError(msg)}
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {([
            { key: 'calories', label: t('recipes.nutrients.calories'), value: calories, setter: setCalories, placeholder: 'kcal' },
            { key: 'protein', label: `${t('recipes.nutrients.protein')} (g)`, value: protein, setter: setProtein },
            { key: 'carbs', label: `${t('recipes.nutrients.carbs')} (g)`, value: carbs, setter: setCarbs },
            { key: 'fat', label: `${t('recipes.nutrients.fat')} (g)`, value: fat, setter: setFat },
            { key: 'fiber', label: `${t('recipes.nutrients.fiber')} (g)`, value: fiber, setter: setFiber },
          ] as const).map(({ key, label, value, setter, placeholder }) => (
            <View key={key} className="min-w-28 flex-1">
              <Input
                label={label}
                value={value}
                onChangeText={setter as (v: string) => void}
                keyboardType="numeric"
                placeholder={placeholder}
              />
            </View>
          ))}
        </View>
        <Input
          label={t('ingredients.density')}
          value={density}
          onChangeText={setDensity}
          keyboardType="numeric"
          placeholder="e.g. 1.0"
        />
        <Text className="text-xs text-text-muted dark:text-text-muted-dark">{t('ingredients.densityHint')}</Text>
      </View>

      {/* Private toggle */}
      <View className="flex-row items-center justify-between">
        <Text className="text-base text-app-text dark:text-text-dark">{t('common.makePrivate')}</Text>
        <Switch value={isPrivate} onValueChange={setIsPrivate} />
      </View>

      {/* Actions */}
      <View className="flex-row gap-2">
        <Button variant="secondary" onPress={onDone}>{t('common.cancel')}</Button>
        <Button onPress={handleSubmit}>{t('common.save')}</Button>
      </View>
    </View>
  )
}
