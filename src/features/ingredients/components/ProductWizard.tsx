import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Camera, LoaderCircle } from 'lucide-react-native'
import { BarcodeScanner, Button, InlineEdit, Input, Modal, TranslatedText } from '../../../components'
import { useAppDispatch } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { transcribeFrontOfPackage, transcribeNutrition } from '../../ai/aiApi'
import { createProduct, updateProduct } from '../ingredientsSlice'
import { lookupBarcode } from '../productsApi'
import type { NutritionalValues } from '../../shared/types'
import type { CreateProductPayload, Product } from '../types'

interface Props {
  /** The ingredient category this product belongs to. */
  ingredientId: string
  /** When provided, the wizard opens in edit mode for an existing product. */
  existingProduct?: Product
  onClose: () => void
}

type Step = 'barcode' | 'details'
type LookupState = 'idle' | 'loading' | 'found' | 'not-found'

/**
 * Multi-step wizard for creating or editing a branded product within an
 * ingredient category.
 *
 * Step 1 – Barcode: live camera scan or manual entry → Open Food Facts lookup
 * Step 2 – Details: name, brand, nutrition, optional AI photo scans
 */
export function ProductWizard({ ingredientId, existingProduct, onClose }: Props) {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const isEdit = !!existingProduct

  const [step, setStep] = useState<Step>(isEdit ? 'details' : 'barcode')
  const [lookupState, setLookupState] = useState<LookupState>('idle')

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState(existingProduct?.name ?? '')
  const [brand, setBrand] = useState(existingProduct?.brand ?? '')
  const [barcode, setBarcode] = useState(existingProduct?.barcode ?? '')
  const [barcodeFormat, setBarcodeFormat] = useState(existingProduct?.barcodeFormat ?? '')
  const [imageUrl, setImageUrl] = useState(existingProduct?.imageUrl ?? '')
  const [calories, setCalories] = useState(String(existingProduct?.nutrition?.calories ?? ''))
  const [protein, setProtein] = useState(String(existingProduct?.nutrition?.protein ?? ''))
  const [carbs, setCarbs] = useState(String(existingProduct?.nutrition?.carbs ?? ''))
  const [fat, setFat] = useState(String(existingProduct?.nutrition?.fat ?? ''))
  const [fiber, setFiber] = useState(String(existingProduct?.nutrition?.fiber ?? ''))
  const [stores, setStores] = useState((existingProduct?.stores ?? []).join(', '))

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frontScanning, setFrontScanning] = useState(false)
  const [nutritionScanning, setNutritionScanning] = useState(false)
  const [nutritionOpen, setNutritionOpen] = useState(
    isEdit && Object.values(existingProduct?.nutrition ?? {}).some((v) => v != null),
  )

  // ── Barcode step ───────────────────────────────────────────────────────────

  async function handleBarcodeDetected(code: string, format: string) {
    setBarcode(code)
    setBarcodeFormat(format)
    setLookupState('loading')

    const result = await lookupBarcode(code)
    if (result) {
      setLookupState('found')
      if (result.name) setName(result.name)
      if (result.brand) setBrand(result.brand)
      if (result.imageUrl) setImageUrl(result.imageUrl)
      if (result.nutrition) {
        if (result.nutrition.calories != null) setCalories(String(result.nutrition.calories))
        if (result.nutrition.protein != null) setProtein(String(result.nutrition.protein))
        if (result.nutrition.carbs != null) setCarbs(String(result.nutrition.carbs))
        if (result.nutrition.fat != null) setFat(String(result.nutrition.fat))
        if (result.nutrition.fiber != null) setFiber(String(result.nutrition.fiber))
        setNutritionOpen(true)
      }
      if (result.stores?.length) setStores(result.stores.join(', '))
    } else {
      setLookupState('not-found')
    }

    setStep('details')
  }

  // ── AI photo scans ─────────────────────────────────────────────────────────
  // On React Native, we use ImagePicker instead of file inputs.
  // For now, show buttons that indicate scanning capability.

  // ── Save ───────────────────────────────────────────────────────────────────

  function parseNum(v: string): number | undefined {
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  async function handleSave() {
    if (!name.trim()) { setError(t('ingredients.form.nameRequired')); return }

    const nutritionPayload: NutritionalValues = {
      calories: parseNum(calories),
      protein: parseNum(protein),
      carbs: parseNum(carbs),
      fat: parseNum(fat),
      fiber: parseNum(fiber),
    }
    const hasNutrition = Object.values(nutritionPayload).some((v) => v !== undefined)

    const storeList = stores
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload: CreateProductPayload = {
      ingredientId,
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.trim() || undefined,
      barcodeFormat: barcodeFormat || undefined,
      imageUrl: imageUrl.trim() || undefined,
      nutrition: hasNutrition ? nutritionPayload : undefined,
      stores: storeList,
    }

    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await dispatch(updateProduct({ id: existingProduct.id, payload })).unwrap()
      } else {
        await dispatch(createProduct(payload)).unwrap()
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const title = isEdit
    ? t('ingredients.editProduct')
    : step === 'barcode'
      ? t('ingredients.scanBarcode')
      : t('ingredients.addProduct')

  const nutritionFields = ['calories', 'protein', 'carbs', 'fat', 'fiber'] as const
  const nutritionValues = { calories, protein, carbs, fat, fiber }
  const nutritionSetters = {
    calories: setCalories, protein: setProtein, carbs: setCarbs, fat: setFat, fiber: setFiber,
  }

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      footer={
        step === 'details' ? (
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={onClose}>
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
      {step === 'barcode' && (
        <View className="gap-3">
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onCancel={() => setStep('details')}
          />
          <Button variant="secondary" onPress={() => setStep('details')}>
            <TranslatedText id="ingredients.skipBarcode" />
          </Button>
        </View>
      )}

      {step === 'details' && (
        <View className="gap-3">
          {/* Barcode lookup status */}
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
              {imageUrl.trim() && (
                <Image source={{ uri: imageUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} contentFit="contain" />
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
          <Input
            label={t('ingredients.barcode')}
            value={barcode}
            onChangeText={setBarcode}
            keyboardType="numeric"
          />

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

          <Input
            label={t('ingredients.stores')}
            value={stores}
            onChangeText={setStores}
            placeholder={t('ingredients.storesPlaceholder')}
          />

          {error && <Text className="text-sm text-error dark:text-error-dark">{error}</Text>}
        </View>
      )}
    </Modal>
  )
}
