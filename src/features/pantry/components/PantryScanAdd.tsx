import { useState } from 'react'
import { View, Text } from 'react-native'
import { Image } from 'expo-image'
import { LoaderCircle } from 'lucide-react-native'
import { BarcodeScanner, Button, Modal, TranslatedText } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { findProductByBarcode } from '../../ingredients/productsApi'
import { updatePantryItem } from '../pantrySlice'
import type { Product } from '../../ingredients/types'

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
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={() => setStep('scan')}>
              <TranslatedText id="pantry.scanAgain" />
            </Button>
            <Button onPress={handleMarkInStock} disabled={saving}>
              {saving
                ? <LoaderCircle size={16} color="#6b7280" />
                : <TranslatedText id="pantry.markInStock" />}
            </Button>
          </View>
        ) : step === 'not-found' ? (
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={() => setStep('scan')}>
              <TranslatedText id="pantry.scanAgain" />
            </Button>
            <Button variant="secondary" onPress={onClose}>
              <TranslatedText id="common.cancel" />
            </Button>
          </View>
        ) : undefined
      }
    >
      {(step === 'scan' || looking) && (
        <View>
          {looking ? (
            <View className="flex-row items-center gap-2 py-4">
              <LoaderCircle size={14} color="#6b7280" />
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                <TranslatedText id="ingredients.lookingUpBarcode" />
              </Text>
            </View>
          ) : (
            <BarcodeScanner onDetected={handleBarcodeDetected} onCancel={onClose} />
          )}
        </View>
      )}

      {step === 'confirm' && product && (
        <View className="flex-row gap-3 py-2">
          {product.imageUrl && (
            <Image source={{ uri: product.imageUrl }} style={{ width: 64, height: 64, borderRadius: 8 }} contentFit="contain" />
          )}
          <View className="flex-1 gap-1">
            {ingredientName && (
              <Text className="text-xs text-text-muted dark:text-text-muted-dark">{ingredientName}</Text>
            )}
            <Text className="text-base font-semibold text-app-text dark:text-text-dark">{product.name}</Text>
            {product.brand && (
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">{product.brand}</Text>
            )}
            <Text className="text-xs font-mono text-text-muted dark:text-text-muted-dark">{barcode}</Text>
          </View>
        </View>
      )}

      {step === 'not-found' && (
        <View className="py-2 gap-2">
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            <TranslatedText id="pantry.productNotFoundInDb" />
          </Text>
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            <TranslatedText id="pantry.addProductFirst" />
          </Text>
        </View>
      )}
    </Modal>
  )
}
