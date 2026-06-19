import { useEffect, useState } from 'react'
import { useDraftPersistence } from '../../../hooks/useDraftPersistence'
import { LoaderCircle } from 'lucide-react'
import { BarcodeScanner, Button, Input, Modal, TranslatedText } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { createIngredient, createProduct } from '../ingredientsSlice'
import { lookupBarcode } from '../productsApi'
import type { NutritionalValues } from '../../shared/types'
import './QuickScanAdd.scss'

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

  // Draft persistence for the details step (not the scan step — no File objects).
  const detailsSnapshot = { name, brand, selectedIngredientId, newCategoryName, calories, protein, carbs, fat, fiber }
  const { savedDraft: savedDetailsDraft, clearDraft } = useDraftPersistence('product-scan', detailsSnapshot, step === 'details')

  // Restore draft when entering the details step for the first time.
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
  // Only on first details step entry
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
      // Prefer OFF category suggestion for pre-selecting the ingredient; fall back to name match.
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

      // Create a new ingredient category if needed
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

  return (
    <Modal
      open
      title={step === 'scan' ? t('ingredients.scanBarcode') : t('ingredients.addProduct')}
      onClose={onClose}
      footer={
        step === 'details' ? (
          <div className="quick-scan-add__footer">
            <Button variant="secondary" onClick={() => { clearDraft(); onClose() }}>
              <TranslatedText id="common.cancel" />
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? <LoaderCircle size={16} className="icon-spin" aria-hidden />
                : <TranslatedText id="common.save" />}
            </Button>
          </div>
        ) : undefined
      }
    >
      {step === 'scan' && (
        <div className="quick-scan-add__scan-step">
          <BarcodeScanner onDetected={handleBarcodeDetected} onCancel={onClose} />
        </div>
      )}

      {step === 'details' && (
        <div className="quick-scan-add__details-step">
          {/* Lookup status + confirmation image */}
          {lookupState === 'loading' && (
            <p className="quick-scan-add__status">
              <LoaderCircle size={14} className="icon-spin" aria-hidden />
              {' '}<TranslatedText id="ingredients.lookingUpBarcode" />
            </p>
          )}
          {lookupState === 'found' && (
            <div className="quick-scan-add__confirmation">
              {confirmationImageUrl && (
                <img src={confirmationImageUrl} alt={name} className="quick-scan-add__confirmation-img" />
              )}
              <p className="quick-scan-add__status quick-scan-add__status--success">
                <TranslatedText id="ingredients.barcodeFound" />
              </p>
            </div>
          )}
          {lookupState === 'not-found' && (
            <p className="quick-scan-add__status quick-scan-add__status--muted">
              <TranslatedText id="ingredients.barcodeNotFound" />
            </p>
          )}

          {/* Product name + brand */}
          <Input id="qsa-name" label={<TranslatedText id="common.name" />}
            value={name} onChange={(e) => setName(e.target.value)} required />
          <Input id="qsa-brand" label={<TranslatedText id="ingredients.brand" />}
            value={brand} onChange={(e) => setBrand(e.target.value)} />

          {/* Ingredient category */}
          <div className="quick-scan-add__field">
            <label className="quick-scan-add__label" htmlFor="qsa-category">
              <TranslatedText id="ingredients.category" />
            </label>
            <select
              id="qsa-category"
              className="quick-scan-add__select"
              value={selectedIngredientId}
              onChange={(e) => { setSelectedIngredientId(e.target.value); setNewCategoryName('') }}
            >
              <option value="">{t('ingredients.newCategory')}</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          {!selectedIngredientId && (
            <Input id="qsa-new-cat" label={<TranslatedText id="ingredients.newCategoryName" />}
              value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
          )}

          {/* Nutrition (auto-expands when scan or barcode lookup fills values) */}
          <details
            className="quick-scan-add__nutrition"
            open={nutritionOpen}
            onToggle={(e) => setNutritionOpen(e.currentTarget.open)}
          >
            <summary><TranslatedText id="ingredients.nutrition" /></summary>
            <div className="quick-scan-add__nutrition-grid">
              {(['calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map((field) => {
                const vals = { calories, protein, carbs, fat, fiber }
                const sets = { calories: setCalories, protein: setProtein, carbs: setCarbs, fat: setFat, fiber: setFiber }
                return (
                  <Input key={field} id={`qsa-${field}`}
                    label={<TranslatedText id={`ingredients.nutrition.${field}`} />}
                    type="number" min={0} step={0.1}
                    value={vals[field]} onChange={(e) => sets[field](e.target.value)} />
                )
              })}
            </div>
          </details>

          {error && <p className="quick-scan-add__error">{error}</p>}
        </div>
      )}
    </Modal>
  )
}
