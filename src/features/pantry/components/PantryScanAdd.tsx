import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { BarcodeScanner, Button, Modal, TranslatedText } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { findProductByBarcode } from '../../ingredients/productsApi'
import { updatePantryItem } from '../pantrySlice'
import type { Product } from '../../ingredients/types'
import './PantryScanAdd.scss'

interface Props {
  onClose: () => void
}

type Step = 'scan' | 'confirm' | 'not-found'

/**
 * Scans a barcode, finds the matching product in the local database,
 * and marks it as in-stock in the pantry with one tap.
 */
export function PantryScanAdd({ onClose }: Props) {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const ingredients = useAppSelector((s) => s.ingredients.items)

  const [step, setStep] = useState<Step>('scan')
  const [looking, setLooking] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [barcode, setBarcode] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleBarcodeDetected(code: string) {
    setBarcode(code)
    setLooking(true)

    const found = await findProductByBarcode(code)
    setLooking(false)

    if (found) {
      setProduct(found)
      setStep('confirm')
    } else {
      setStep('not-found')
    }
  }

  async function handleMarkInStock() {
    if (!product) return
    setSaving(true)
    try {
      await dispatch(
        updatePantryItem({
          ingredientId: product.ingredientId,
          productId: product.id,
          payload: { inStock: true },
        }),
      ).unwrap()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const ingredientName =
    ingredients.find((i) => i.id === product?.ingredientId)?.name ?? ''

  return (
    <Modal
      open
      title={t('pantry.scanToAdd')}
      onClose={onClose}
      footer={
        step === 'confirm' ? (
          <div className="pantry-scan-add__footer">
            <Button variant="secondary" onClick={() => setStep('scan')}>
              <TranslatedText id="pantry.scanAgain" />
            </Button>
            <Button onClick={handleMarkInStock} disabled={saving}>
              {saving
                ? <LoaderCircle size={16} className="icon-spin" aria-hidden />
                : <TranslatedText id="pantry.markInStock" />}
            </Button>
          </div>
        ) : step === 'not-found' ? (
          <div className="pantry-scan-add__footer">
            <Button variant="secondary" onClick={() => setStep('scan')}>
              <TranslatedText id="pantry.scanAgain" />
            </Button>
            <Button variant="secondary" onClick={onClose}>
              <TranslatedText id="common.cancel" />
            </Button>
          </div>
        ) : undefined
      }
    >
      {(step === 'scan' || looking) && (
        <div className="pantry-scan-add__scan">
          {looking ? (
            <p className="pantry-scan-add__status">
              <LoaderCircle size={14} className="icon-spin" aria-hidden />
              {' '}<TranslatedText id="ingredients.lookingUpBarcode" />
            </p>
          ) : (
            <BarcodeScanner onDetected={handleBarcodeDetected} onCancel={onClose} />
          )}
        </div>
      )}

      {step === 'confirm' && product && (
        <div className="pantry-scan-add__confirm">
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="pantry-scan-add__img" />
          )}
          <div className="pantry-scan-add__product-info">
            {ingredientName && (
              <span className="pantry-scan-add__category">{ingredientName}</span>
            )}
            <span className="pantry-scan-add__name">{product.name}</span>
            {product.brand && (
              <span className="pantry-scan-add__brand">{product.brand}</span>
            )}
            <code className="pantry-scan-add__barcode">{barcode}</code>
          </div>
        </div>
      )}

      {step === 'not-found' && (
        <div className="pantry-scan-add__not-found">
          <p className="pantry-scan-add__status pantry-scan-add__status--muted">
            <TranslatedText id="pantry.productNotFoundInDb" />
          </p>
          <p className="pantry-scan-add__hint">
            <TranslatedText id="pantry.addProductFirst" />
          </p>
        </div>
      )}
    </Modal>
  )
}
