import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Modal, TranslatedText } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { deleteProduct } from '../ingredientsSlice'
import type { Ingredient, Product } from '../types'
import { ProductWizard } from './ProductWizard'
import './IngredientDetail.scss'

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
