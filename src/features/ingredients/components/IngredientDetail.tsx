import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Pencil, Plus, Store, Trash2 } from 'lucide-react-native'
import { Button, Input, Modal, TranslatedText } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { deleteProduct } from '../ingredientsSlice'
import type { Ingredient, PriceReport, Product } from '../types'
import { fetchCurrentPrices, reportProductPrice } from '../productsApi'
import { ProductWizard } from './ProductWizard'

/** Inline panel showing crowd-sourced prices per store for a product. */
function ProductPricePanel({ product }: { product: Product }) {
  const { t } = useLanguage()
  const currency = useAppSelector((s) => s.settings.preferredCurrency) ?? 'NOK'

  const [prices, setPrices] = useState<PriceReport[]>([])
  const [showForm, setShowForm] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [priceVal, setPriceVal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrentPrices(product.id).then(setPrices).catch(() => {})
  }, [product.id])

  async function handleSubmitPrice() {
    const p = parseFloat(priceVal)
    if (!storeName.trim() || isNaN(p) || p <= 0) return
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const { status } = await reportProductPrice(product.id, storeName.trim(), p, currency)
      if (status === 'pending_review') {
        setSubmitMsg(t('ingredients.pricePendingReview'))
      } else {
        setPrices(await fetchCurrentPrices(product.id))
        setSubmitMsg(t('ingredients.priceThanks'))
      }
      setShowForm(false)
      setStoreName('')
      setPriceVal('')
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="gap-2 mt-2">
      {prices.length > 0 && (
        <View className="gap-1">
          {prices.map((pr) => (
            <View key={pr.id} className="flex-row items-center gap-2">
              <Store size={12} color="#6b7280" />
              <Text className="text-xs text-text-muted dark:text-text-muted-dark">{pr.storeName}</Text>
              <Text className="text-xs font-semibold text-app-text dark:text-text-dark">{pr.price} {pr.currency}</Text>
            </View>
          ))}
        </View>
      )}
      {submitMsg && <Text className="text-xs text-info dark:text-info-dark">{submitMsg}</Text>}
      {showForm ? (
        <View className="gap-2">
          <Input
            label={t('ingredients.storeName')}
            value={storeName}
            onChangeText={setStoreName}
          />
          <Input
            label={`${t('ingredients.price')} (${currency})`}
            value={priceVal}
            onChangeText={setPriceVal}
            keyboardType="numeric"
          />
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onPress={handleSubmitPrice} disabled={submitting}>{t('ingredients.reportPrice')}</Button>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setShowForm(true)} className="active:opacity-70">
          <Text className="text-xs text-accent dark:text-accent-dark">+ {t('ingredients.reportPrice')}</Text>
        </Pressable>
      )}
    </View>
  )
}

interface Props {
  ingredient: Ingredient
  onClose: () => void
  /** Called when the user wants to edit the ingredient category itself. */
  onEditCategory: () => void
}

/**
 * Modal panel showing the products (specific brands) that belong to an
 * ingredient category, with options to add, edit, and delete them.
 */
export function IngredientDetail({ ingredient, onClose, onEditCategory }: Props) {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()

  // Keep a live view from the Redux store so product changes reflect immediately.
  const liveIngredient = useAppSelector((s) =>
    s.ingredients.items.find((i) => i.id === ingredient.id),
  ) ?? ingredient

  const [showAdd, setShowAdd] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  async function handleDeleteProduct(product: Product) {
    dispatch(deleteProduct({ id: product.id, ingredientId: liveIngredient.id }))
  }

  const products = liveIngredient.products ?? []

  return (
    <>
      <Modal
        open
        title={liveIngredient.name}
        onClose={onClose}
        footer={
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={onEditCategory}>
              <Pencil size={15} color="#6b7280" />
              <TranslatedText id="common.edit" />
            </Button>
            <Button onPress={() => setShowAdd(true)}>
              <Plus size={15} color="#ffffff" />
              <TranslatedText id="ingredients.addProduct" />
            </Button>
          </View>
        }
      >
        <View className="gap-3">
          {/* Ingredient category metadata */}
          <View className="flex-row flex-wrap gap-3">
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              {t(`ingredients.categories.${liveIngredient.category}`)}
            </Text>
            {liveIngredient.density != null && (
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                {liveIngredient.density} g/ml
              </Text>
            )}
            {liveIngredient.defaultExpiryDays != null && (
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                {liveIngredient.defaultExpiryDays} {t('ingredients.expiryDays')}
              </Text>
            )}
          </View>

          {/* Product list */}
          {products.length === 0 ? (
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              <TranslatedText id="ingredients.noProducts" />
            </Text>
          ) : (
            <View className="gap-3">
              {products.map((p) => (
                <View key={p.id} className="flex-row gap-3 bg-surface dark:bg-surface-dark rounded-xl p-3 border border-border dark:border-border-dark">
                  {p.imageUrl && (
                    <Image
                      source={{ uri: p.imageUrl }}
                      style={{ width: 56, height: 56, borderRadius: 8 }}
                      contentFit="contain"
                    />
                  )}
                  <View className="flex-1 gap-0.5">
                    <Text className="text-sm font-semibold text-app-text dark:text-text-dark">{p.name}</Text>
                    {p.brand && (
                      <Text className="text-xs text-text-muted dark:text-text-muted-dark">{p.brand}</Text>
                    )}
                    {p.barcode && (
                      <Text className="text-xs font-mono text-text-muted dark:text-text-muted-dark">{p.barcode}</Text>
                    )}
                    {p.nutrition && (
                      <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                        {[
                          p.nutrition.calories != null && `${p.nutrition.calories} kcal`,
                          p.nutrition.protein != null && `${p.nutrition.protein}g protein`,
                          p.nutrition.carbs != null && `${p.nutrition.carbs}g carbs`,
                          p.nutrition.fat != null && `${p.nutrition.fat}g fat`,
                        ].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                    {p.stores && p.stores.length > 0 && (
                      <Text className="text-xs text-text-muted dark:text-text-muted-dark">{p.stores.join(', ')}</Text>
                    )}
                    <ProductPricePanel product={p} />
                  </View>
                  <View className="gap-1">
                    <Pressable onPress={() => setEditingProduct(p)} className="p-1 active:opacity-70" accessibilityLabel={t('common.edit')}>
                      <Pencil size={15} color="#6b7280" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteProduct(p)} className="p-1 active:opacity-70" accessibilityLabel={t('common.delete')}>
                      <Trash2 size={15} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* Add product wizard */}
      {showAdd && (
        <ProductWizard
          ingredientId={liveIngredient.id}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit product wizard */}
      {editingProduct && (
        <ProductWizard
          ingredientId={liveIngredient.id}
          existingProduct={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </>
  )
}
