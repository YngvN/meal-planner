import { useRef, useState } from 'react'
import { Camera, LoaderCircle } from 'lucide-react'
import { BarcodeScanner, Button, Input, Modal, TranslatedText } from '../../../components'
import { useAppDispatch } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { transcribeFrontOfPackage, transcribeNutrition } from '../../ai/aiApi'
import { createProduct, updateProduct } from '../ingredientsSlice'
import { lookupBarcode } from '../productsApi'
import type { NutritionalValues } from '../../shared/types'
import type { CreateProductPayload, Product } from '../types'
import './ProductWizard.scss'

interface Props {
  /** The ingredient category this product belongs to. */
  ingredientId: string
  /** When provided, the wizard opens in edit mode for an existing product. */
  existingProduct?: Product
  onClose: () => void
}

type Step = 'barcode' | 'details'
type LookupState = 'idle' | 'loading' | 'found' | 'not-found'

/** Reads a File as a base64 string (without the data: prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

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

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frontScanning, setFrontScanning] = useState(false)
  const [nutritionScanning, setNutritionScanning] = useState(false)
  const [nutritionOpen, setNutritionOpen] = useState(
    // Auto-open if editing a product that already has nutrition
    isEdit && Object.values(existingProduct?.nutrition ?? {}).some((v) => v != null),
  )

  const frontInputRef = useRef<HTMLInputElement>(null)
  const nutritionInputRef = useRef<HTMLInputElement>(null)

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
    } else {
      setLookupState('not-found')
    }

    setStep('details')
  }

  // ── AI photo scans ─────────────────────────────────────────────────────────

  async function handleFrontFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFrontScanning(true)
    try {
      const base64 = await fileToBase64(file)
      const result = await transcribeFrontOfPackage(base64, file.type)
      if (result.productName) setName(result.productName)
      if (result.brand) setBrand(result.brand)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.frontScanError'))
    } finally {
      setFrontScanning(false)
    }
  }

  async function handleNutritionFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setNutritionScanning(true)
    try {
      const base64 = await fileToBase64(file)
      const nutrition: NutritionalValues = await transcribeNutrition(base64, file.type)
      if (nutrition.calories != null) setCalories(String(nutrition.calories))
      if (nutrition.protein != null) setProtein(String(nutrition.protein))
      if (nutrition.carbs != null) setCarbs(String(nutrition.carbs))
      if (nutrition.fat != null) setFat(String(nutrition.fat))
      if (nutrition.fiber != null) setFiber(String(nutrition.fiber))
      setNutritionOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.scanError'))
    } finally {
      setNutritionScanning(false)
    }
  }

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

    const payload: CreateProductPayload = {
      ingredientId,
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.trim() || undefined,
      barcodeFormat: barcodeFormat || undefined,
      imageUrl: imageUrl.trim() || undefined,
      nutrition: hasNutrition ? nutritionPayload : undefined,
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const title = isEdit
    ? t('ingredients.editProduct')
    : step === 'barcode'
      ? t('ingredients.scanBarcode')
      : t('ingredients.addProduct')

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      footer={
        step === 'details' && (
          <div className="product-wizard__footer-buttons">
            <Button type="button" variant="secondary" onClick={onClose}>
              <TranslatedText id="common.cancel" />
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving
                ? <LoaderCircle size={16} className="icon-spin" aria-hidden />
                : <TranslatedText id="common.save" />}
            </Button>
          </div>
        )
      }
    >
      {step === 'barcode' && (
        <div className="product-wizard__barcode-step">
          <BarcodeScanner
            onDetected={handleBarcodeDetected}
            onCancel={() => setStep('details')}
          />
          <button
            type="button"
            className="product-wizard__skip"
            onClick={() => setStep('details')}
          >
            <TranslatedText id="ingredients.skipBarcode" />
          </button>
        </div>
      )}

      {step === 'details' && (
        <div className="product-wizard__details-step">
          {/* Barcode lookup result — image shown here as scan confirmation */}
          {lookupState === 'loading' && (
            <p className="product-wizard__status">
              <LoaderCircle size={14} className="icon-spin" aria-hidden />
              {' '}<TranslatedText id="ingredients.lookingUpBarcode" />
            </p>
          )}
          {lookupState === 'found' && (
            <div className="product-wizard__confirmation">
              {imageUrl.trim() && (
                <img
                  src={imageUrl}
                  alt={name}
                  className="product-wizard__confirmation-img"
                />
              )}
              <p className="product-wizard__status product-wizard__status--success">
                <TranslatedText id="ingredients.barcodeFound" />
              </p>
            </div>
          )}
          {lookupState === 'not-found' && (
            <p className="product-wizard__status product-wizard__status--muted">
              <TranslatedText id="ingredients.barcodeNotFound" />
            </p>
          )}

          {/* AI scan buttons — only shown when barcode didn't resolve everything */}
          <div className="product-wizard__scan-row">
            <input ref={frontInputRef} type="file" accept="image/*" capture="environment"
              className="product-wizard__hidden-input" onChange={handleFrontFile} />
            <Button type="button" variant="secondary"
              onClick={() => frontInputRef.current?.click()} disabled={frontScanning}>
              {frontScanning
                ? <><LoaderCircle size={16} className="icon-spin" aria-hidden /> <TranslatedText id="ai.scanningFront" /></>
                : <><Camera size={16} aria-hidden /> <TranslatedText id="ai.scanFront" /></>}
            </Button>

            <input ref={nutritionInputRef} type="file" accept="image/*" capture="environment"
              className="product-wizard__hidden-input" onChange={handleNutritionFile} />
            <Button type="button" variant="secondary"
              onClick={() => nutritionInputRef.current?.click()} disabled={nutritionScanning}>
              {nutritionScanning
                ? <><LoaderCircle size={16} className="icon-spin" aria-hidden /> <TranslatedText id="ai.scanning" /></>
                : <><Camera size={16} aria-hidden /> <TranslatedText id="ai.scanNutrition" /></>}
            </Button>
          </div>

          {/* Core fields — no image URL input; image comes from OFF barcode lookup only */}
          <Input id="pw-name" label={<TranslatedText id="common.name" />}
            value={name} onChange={(e) => setName(e.target.value)} required />
          <Input id="pw-brand" label={<TranslatedText id="ingredients.brand" />}
            value={brand} onChange={(e) => setBrand(e.target.value)} />
          <Input id="pw-barcode" label={<TranslatedText id="ingredients.barcode" />}
            value={barcode} onChange={(e) => setBarcode(e.target.value)} />

          {/* Nutrition (auto-expands after barcode lookup or AI label scan fills values) */}
          <details
            className="product-wizard__nutrition"
            open={nutritionOpen}
            onToggle={(e) => setNutritionOpen(e.currentTarget.open)}
          >
            <summary><TranslatedText id="ingredients.nutrition" /></summary>
            <div className="product-wizard__nutrition-fields">
              {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field) => {
                const map = { calories, protein, carbs, fat, fiber }
                const setMap = { calories: setCalories, protein: setProtein, carbs: setCarbs, fat: setFat, fiber: setFiber }
                return (
                  <Input key={field} id={`pw-${field}`}
                    label={<TranslatedText id={`ingredients.nutrition.${field}`} />}
                    type="number" min={0} step={0.1}
                    value={map[field]}
                    onChange={(e) => setMap[field](e.target.value)} />
                )
              })}
            </div>
          </details>

          {error && <p className="product-wizard__error">{error}</p>}
        </div>
      )}
    </Modal>
  )
}
