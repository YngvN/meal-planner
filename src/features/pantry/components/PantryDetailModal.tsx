import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button, Modal } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { localizedIngredientName } from '../../shared/localize'
import { updatePantryItem } from '../pantrySlice'
import './PantryDetailModal.scss'

const COUNT_UNITS = new Set(['pcs', 'bunch', 'can', 'bottle', 'bag', 'box', 'pack', 'slice', 'clove', 'head'])

/**
 * Standard kitchen unit groups. Each unit key maps to a translation at
 * `pantry.unitLabels.<key>`. The `value` stored in the pantry is always the
 * English abbreviation so unit matching in recipe deduction stays consistent.
 */
const UNIT_GROUPS: Array<{ groupKey: string; units: string[] }> = [
  { groupKey: 'weight', units: ['g', 'kg', 'oz', 'lb'] },
  { groupKey: 'volume', units: ['ml', 'dl', 'L', 'tsp', 'tbsp', 'flOz', 'cup', 'pint', 'quart'] },
  { groupKey: 'count',  units: ['pcs', 'bunch', 'can', 'bottle', 'bag', 'box', 'pack', 'slice', 'clove', 'head'] },
]

interface PantryDetailModalProps {
  ingredientId: string
  onClose: () => void
}

/**
 * Modal for viewing and editing a single pantry item's quantity, unit,
 * expiry date, in-stock, and low-stock flags.
 */
export function PantryDetailModal({ ingredientId, onClose }: PantryDetailModalProps) {
  const dispatch = useAppDispatch()
  const { t, language } = useLanguage()

  const ingredient = useAppSelector((s) => s.ingredients.items.find((i) => i.id === ingredientId))
  const pantryItem = useAppSelector((s) =>
    s.pantry.items.find((p) => p.ingredientId === ingredientId),
  )

  const [quantity, setQuantity] = useState(pantryItem?.quantity?.toString() ?? '')
  const [unit, setUnit] = useState(pantryItem?.unit ?? '')

  function qtyStep() { return COUNT_UNITS.has(unit) ? 1 : 10 }

  function adjustQty(delta: number) {
    const current = parseFloat(quantity) || 0
    const next = Math.max(0, current + delta)
    setQuantity(COUNT_UNITS.has(unit) ? String(next) : next.toFixed(1).replace(/\.0$/, ''))
  }
  const [expiresAt, setExpiresAt] = useState(pantryItem?.expiresAt?.slice(0, 10) ?? '')
  const [inStock, setInStock] = useState(pantryItem?.inStock ?? false)
  const [isLow, setIsLow] = useState(pantryItem?.isLow ?? false)

  async function handleSave() {
    await dispatch(
      updatePantryItem({
        ingredientId,
        payload: {
          inStock,
          isLow,
          quantity: quantity === '' ? undefined : Number(quantity),
          unit: unit.trim() || undefined,
          expiresAt: expiresAt ? new Date(expiresAt + 'T12:00:00').toISOString() : undefined,
        },
      }),
    )
    onClose()
  }

  const title = ingredient ? localizedIngredientName(ingredient, language) : ingredientId

  return (
    <Modal
      open
      onClose={onClose}
      title={t('pantry.editItem')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="pantry-detail-modal">
        {ingredient?.imageUrl && (
          <img
            src={ingredient.imageUrl}
            alt={ingredient.name}
            className="pantry-detail-modal__img"
          />
        )}

        <div className="pantry-detail-modal__name">{title}</div>

        <div className="pantry-detail-modal__fields">
          {/* Quantity + unit on one row */}
          <div className="pantry-detail-modal__row">
            <label className="pantry-detail-modal__label" htmlFor="pdi-quantity">
              {t('pantry.quantity')}
            </label>
            <div className="pantry-detail-modal__qty-row">
              <button
                type="button"
                className="pantry-detail-modal__qty-btn"
                onClick={() => adjustQty(-qtyStep())}
                aria-label="Decrease"
              >
                <Minus size={16} aria-hidden />
              </button>
              <input
                id="pdi-quantity"
                type="number"
                className="pantry-detail-modal__qty-input pantry-detail-modal__num-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={0}
                step={qtyStep()}
                placeholder="0"
              />
              <button
                type="button"
                className="pantry-detail-modal__qty-btn"
                onClick={() => adjustQty(qtyStep())}
                aria-label="Increase"
              >
                <Plus size={16} aria-hidden />
              </button>
              <select
                className="pantry-detail-modal__unit-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                aria-label={t('pantry.unit')}
              >
                <option value="">—</option>
                {UNIT_GROUPS.map((group) => (
                  <optgroup key={group.groupKey} label={t(`pantry.unitGroups.${group.groupKey}`)}>
                    {group.units.map((u) => (
                      <option key={u} value={u}>{t(`pantry.unitLabels.${u}`)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Expiry date */}
          <div className="pantry-detail-modal__row">
            <label className="pantry-detail-modal__label" htmlFor="pdi-expiry">
              {t('pantry.expiryDate')}
            </label>
            <input
              id="pdi-expiry"
              type="date"
              className="pantry-detail-modal__date-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          {/* Toggles */}
          <div className="pantry-detail-modal__toggles">
            <label className="pantry-detail-modal__toggle-label">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="pantry-detail-modal__checkbox"
              />
              {t('pantry.inStock')}
            </label>
            <label className="pantry-detail-modal__toggle-label">
              <input
                type="checkbox"
                checked={isLow}
                onChange={(e) => setIsLow(e.target.checked)}
                className="pantry-detail-modal__checkbox"
              />
              {t('pantry.low')}
            </label>
          </div>
        </div>
      </div>
    </Modal>
  )
}
