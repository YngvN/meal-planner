import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useDraftPersistence } from '../../../hooks/useDraftPersistence'
import { LoaderCircle } from 'lucide-react-native'
import { BarcodeScanner, Button, InlineEdit, Input, Modal, Select, TranslatedText } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { createIngredient, createProduct } from '../ingredientsSlice'
import { lookupBarcode } from '../productsApi'
import type { NutritionalValues } from '../../shared/types'

interface Props {
  onClose: () => void
  /** Called with the new product's ingredient id so the caller can open the detail panel. */
  onDone?: (ingredientId: string) => void
}

type Step = 'scan' | 'details'
type LookupState = 'idle' | 'loading' | 'found' | 'not-found'

/**
 * Quick-add flow: scan a barcode → Open Food Facts lookup pre-fills details →
 * user picks (or creates) an ingredient category → saves the product.
 */
export function QuickScanAdd({ onClose, onDone }: Props) {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const ingredients = useAppSelector((s) => s.ingredients.items)

  const [step, setStep] = useState<Step>('scan')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Barcode
  const [barcode, setBarcode] = useState('')
  const [barcodeFormat, setBarcodeFormat] = useState('')
  const [confirmationImageUrl, setConfirmationImageUrl] = useState<string | undefined>()

  // Product details
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [selectedIngredientId, setSelectedIngredientId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [nutritionOpen, setNutritionOpen] = useState(false)

  const detailsSnapshot = { name, brand, selectedIngredientId, newCategoryName, calories, protein, carbs, fat, fiber }
  const { savedDraft: savedDetailsDraft, clearDraft } = useDraftPersistence('product-scan', detailsSnapshot, step === 'details')

  useEffect(() => {
    if (step === 'details' && savedDetailsDraft && !name) {
      const d = savedDetailsDraft
      if (d.name) setName(d.name)
      if (d.brand) setBrand(d.brand)
      if (d.selectedIngredientId) setSelectedIngredientId(d.selectedIngredientId)
      if (d.newCategoryName) setNewCategoryName(d.newCategoryName)
      if (d.calories) setCalories(d.calories)
      if (d.protein) setProtein(d.protein)
      if (d.carbs) setCarbs(d.carbs)
      if (d.fat) setFat(d.fat)
      if (d.fiber) setFiber(d.fiber)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── Barcode detected ───────────────────────────────────────────────────────

  async function handleBarcodeDetected(code: string, format: string) {
    setBarcode(code)
    setBarcodeFormat(format)
    setLookupState('loading')
    setStep('details')

    const result = await lookupBarcode(code)
    if (result) {
      setLookupState('found')
      if (result.name) setName(result.name)
      if (result.brand) setBrand(result.brand)
      if (result.imageUrl) setConfirmationImageUrl(result.imageUrl)
      if (result.nutrition) {
        if (result.nutrition.calories != null) setCalories(String(result.nutrition.calories))
        if (result.nutrition.protein != null) setProtein(String(result.nutrition.protein))
        if (result.nutrition.carbs != null) setCarbs(String(result.nutrition.carbs))
        if (result.nutrition.fat != null) setFat(String(result.nutrition.fat))
        if (result.nutrition.fiber != null) setFiber(String(result.nutrition.fiber))
        setNutritionOpen(true)
      }
      const nameLower = result.name?.toLowerCase() ?? ''
      const categoryMatch = result.suggestedCategory
        ? ingredients.find((i) => i.category === result.suggestedCategory)
        : null
      const nameMatch = ingredients.find((i) => i.name.toLowerCase().includes(nameLower.split(' ')[0]))
      const match = categoryMatch ?? nameMatch
      if (match) setSelectedIngredientId(match.id)
    } else {
      setLookupState('not-found')
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function parseNum(v: string): number | undefined {
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  async function handleSave() {
    if (!name.trim()) { setError(t('ingredients.form.nameRequired')); return }
    if (!selectedIngredientId && !newCategoryName.trim()) {
      setError(t('ingredients.categoryRequired'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      let ingredientId = selectedIngredientId

      if (!ingredientId) {
        const created = await dispatch(
          createIngredient({ name: newCategoryName.trim(), category: 'other' }),
        ).unwrap()
        ingredientId = created.id
      }

      const nutritionPayload: NutritionalValues = {
        calories: parseNum(calories),
        protein: parseNum(protein),
        carbs: parseNum(carbs),
        fat: parseNum(fat),
        fiber: parseNum(fiber),
      }
      const hasNutrition = Object.values(nutritionPayload).some((v) => v !== undefined)

      await dispatch(
        createProduct({
          ingredientId,
          name: name.trim(),
          brand: brand.trim() || undefined,
          barcode: barcode || undefined,
          barcodeFormat: barcodeFormat || undefined,
          imageUrl: confirmationImageUrl,
          nutrition: hasNutrition ? nutritionPayload : undefined,
        }),
      ).unwrap()

      clearDraft()
      onDone?.(ingredientId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const categoryOptions = [
    { value: '', label: t('ingredients.newCategory') },
    ...ingredients.map((i) => ({ value: i.id, label: i.name })),
  ]

  const nutritionFields = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const
  const nutritionValues = { calories, protein, carbs, fat, fiber }
  const nutritionSetters = {
    calories: setCalories, protein: setProtein, carbs: setCarbs, fat: setFat, fiber: setFiber,
  }

  return (
    <Modal
      open
      title={step === 'scan' ? t('ingredients.scanBarcode') : t('ingredients.addProduct')}
      onClose={onClose}
      footer={
        step === 'details' ? (
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={() => { clearDraft(); onClose() }}>
              <TranslatedText id="common.cancel" />
            </Button>
            <Button onPress={handleSave} disabled={saving}>
              {saving
                ? <LoaderCircle size={16} color="#6b7280" />
                : <TranslatedText id="common.save" />}
            </Button>
          </View>
        ) : undefined
      }
    >
      {step === 'scan' && (
        <View>
          <BarcodeScanner onDetected={handleBarcodeDetected} onCancel={onClose} />
        </View>
      )}

      {step === 'details' && (
        <View className="gap-3">
          {/* Lookup status + confirmation image */}
          {lookupState === 'loading' && (
            <View className="flex-row items-center gap-2">
              <LoaderCircle size={14} color="#6b7280" />
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                <TranslatedText id="ingredients.lookingUpBarcode" />
              </Text>
            </View>
          )}
          {lookupState === 'found' && (
            <View className="gap-2">
              {confirmationImageUrl && (
                <Image source={{ uri: confirmationImageUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} contentFit="contain" />
              )}
              <Text className="text-sm text-success dark:text-success-dark">
                <TranslatedText id="ingredients.barcodeFound" />
              </Text>
            </View>
          )}
          {lookupState === 'not-found' && (
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              <TranslatedText id="ingredients.barcodeNotFound" />
            </Text>
          )}

          <View className="gap-1">
            <Text className="text-sm font-medium text-app-text dark:text-text-dark"><TranslatedText id="common.name" /></Text>
            <InlineEdit value={name} onChange={setName} placeholder={t('common.name')} />
          </View>
          <View className="gap-1">
            <Text className="text-sm font-medium text-app-text dark:text-text-dark"><TranslatedText id="ingredients.brand" /></Text>
            <InlineEdit value={brand} onChange={setBrand} placeholder={t('ingredients.brand')} />
          </View>

          <Select
            label={t('ingredients.category')}
            value={selectedIngredientId}
            onChange={(v) => { setSelectedIngredientId(v); setNewCategoryName('') }}
            options={categoryOptions}
          />

          {!selectedIngredientId && (
            <Input
              label={t('ingredients.newCategoryName')}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
          )}

          {/* Nutrition section */}
          <Pressable
            onPress={() => setNutritionOpen((v) => !v)}
            className="flex-row items-center justify-between py-2 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-app-text dark:text-text-dark">
              <TranslatedText id="ingredients.nutrition" />
            </Text>
            <Text className="text-xs text-accent dark:text-accent-dark">
              {nutritionOpen ? '▲' : '▼'}
            </Text>
          </Pressable>
          {nutritionOpen && (
            <View className="gap-2">
              {nutritionFields.map((field) => (
                <Input
                  key={field}
                  label={t(`ingredients.nutrition.${field}`)}
                  value={nutritionValues[field]}
                  onChangeText={nutritionSetters[field]}
                  keyboardType="numeric"
                />
              ))}
            </View>
          )}

          {error && <Text className="text-sm text-error dark:text-error-dark">{error}</Text>}
        </View>
      )}
    </Modal>
  )
}
