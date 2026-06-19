import { useEffect, useState } from 'react'
import { Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { Button, Input, Modal, TranslatedText } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { deleteProduct } from '../ingredientsSlice'
import type { Ingredient, PriceReport, Product } from '../types'
import { fetchCurrentPrices, reportProductPrice } from '../productsApi'
import { ProductWizard } from './ProductWizard'
import './IngredientDetail.scss'

/** Inline panel showing crowd-sourced prices per store for a product. */
function ProductPricePanel({ product }: { product: Product }) {
  const { t } = useLanguage()
  const settings = useAppSelector((s) => s.settings)
  const currency = (settings as Record<string, unknown>).preferredCurrency as string ?? 'NOK'

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
    <div className="ingredient-detail__prices">
      {prices.length > 0 && (
        <ul className="ingredient-detail__price-list">
          {prices.map((pr) => (
            <li key={pr.id} className="ingredient-detail__price-item">
              <Store size={12} aria-hidden />
              <span>{pr.storeName}</span>
              <strong>{pr.price} {pr.currency}</strong>
            </li>
          ))}
        </ul>
      )}
      {submitMsg && <p className="ingredient-detail__price-msg">{submitMsg}</p>}
      {showForm ? (
        <div className="ingredient-detail__price-form">
          <Input
            id={`price-store-${product.id}`}
            label={t('ingredients.storeName')}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
          <Input
            id={`price-val-${product.id}`}
            label={`${t('ingredients.price')} (${currency})`}
            type="number"
            min={0}
            step={0.01}
            value={priceVal}
            onChange={(e) => setPriceVal(e.target.value)}
          />
          <div className="ingredient-detail__price-actions">
            <Button variant="secondary" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmitPrice} disabled={submitting}>{t('ingredients.reportPrice')}</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="ingredient-detail__price-btn"
          onClick={() => setShowForm(true)}
        >
          + {t('ingredients.reportPrice')}
        </button>
      )}
    </div>
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
    if (!window.confirm(t('common.confirmDelete'))) return
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
          <div className="ingredient-detail__footer">
            <Button type="button" variant="secondary" onClick={onEditCategory}>
              <Pencil size={15} aria-hidden />
              <TranslatedText id="common.edit" />
            </Button>
            <Button type="button" onClick={() => setShowAdd(true)}>
              <Plus size={15} aria-hidden />
              <TranslatedText id="ingredients.addProduct" />
            </Button>
          </div>
        }
      >
        <div className="ingredient-detail">
          {/* Ingredient category metadata */}
          <div className="ingredient-detail__meta">
            <span className="ingredient-detail__meta-item">
              {t(`ingredients.categories.${liveIngredient.category}`)}
            </span>
            {liveIngredient.density != null && (
              <span className="ingredient-detail__meta-item">
                {liveIngredient.density} g/ml
              </span>
            )}
            {liveIngredient.defaultExpiryDays != null && (
              <span className="ingredient-detail__meta-item">
                {liveIngredient.defaultExpiryDays} {t('ingredients.expiryDays')}
              </span>
            )}
          </div>

          {/* Product list */}
          {products.length === 0 ? (
            <p className="ingredient-detail__empty">
              <TranslatedText id="ingredients.noProducts" />
            </p>
          ) : (
            <ul className="ingredient-detail__product-list">
              {products.map((p) => (
                <li key={p.id} className="ingredient-detail__product">
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="ingredient-detail__product-img"
                    />
                  )}
                  <div className="ingredient-detail__product-info">
                    <span className="ingredient-detail__product-name">{p.name}</span>
                    {p.brand && (
                      <span className="ingredient-detail__product-brand">{p.brand}</span>
                    )}
                    {p.barcode && (
                      <code className="ingredient-detail__product-barcode">{p.barcode}</code>
                    )}
                    {p.nutrition && (
                      <span className="ingredient-detail__product-nutrition">
                        {[
                          p.nutrition.calories != null && `${p.nutrition.calories} kcal`,
                          p.nutrition.protein != null && `${p.nutrition.protein}g protein`,
                          p.nutrition.carbs != null && `${p.nutrition.carbs}g carbs`,
                          p.nutrition.fat != null && `${p.nutrition.fat}g fat`,
                          p.nutrition.fiber != null && `${p.nutrition.fiber}g fiber`,
                        ].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    {p.stores && p.stores.length > 0 && (
                      <span className="ingredient-detail__product-stores">
                        {p.stores.join(', ')}
                      </span>
                    )}
                    <ProductPricePanel product={p} />
                  </div>
                  <div className="ingredient-detail__product-actions">
                    <button
                      type="button"
                      className="ingredient-detail__icon-btn"
                      aria-label={t('common.edit')}
                      onClick={() => setEditingProduct(p)}
                    >
                      <Pencil size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="ingredient-detail__icon-btn ingredient-detail__icon-btn--danger"
                      aria-label={t('common.delete')}
                      onClick={() => handleDeleteProduct(p)}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
