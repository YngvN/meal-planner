import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Barcode, Pencil, Plus, Trash2 } from 'lucide-react'
import { Alert, Badge, Button, Modal, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { localizedIngredientName } from '../../shared/localize'
import { deleteIngredient, fetchIngredients } from '../ingredientsSlice'
import type { Ingredient } from '../types'
import { IngredientDetail } from './IngredientDetail'
import { IngredientForm } from './IngredientForm'
import { QuickScanAdd } from './QuickScanAdd'
import './IngredientList.scss'

type AddMode = 'choice' | 'scan' | 'manual'

/**
 * Searchable ingredient library table.
 * "Add ingredient" shows a choice first: scan a barcode or fill in the form.
 * Clicking an ingredient name opens the IngredientDetail panel for managing products.
 */
export function IngredientList() {
  const dispatch = useAppDispatch()
  const { t, language } = useLanguage()
  const { items: ingredients, status, error } = useAppSelector((s) => s.ingredients)
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [addMode, setAddMode] = useState<AddMode | null>(null)
  const [manualEdit, setManualEdit] = useState<Ingredient | null>(null)
  const [detailIngredient, setDetailIngredient] = useState<Ingredient | null>(null)

  useEffect(() => {
    if (status === 'idle' && ingredients.length === 0) dispatch(fetchIngredients())
  }, [dispatch, status, ingredients.length])

  const editId = searchParams.get('edit')
  const urlEditIngredient = editId ? (ingredients.find((i) => i.id === editId) ?? null) : null
  const editingIngredient = urlEditIngredient ?? manualEdit

  function closeEditModal() {
    if (editId) setSearchParams({}, { replace: true })
    setManualEdit(null)
  }

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleDelete(ingredient: Ingredient) {
    if (!window.confirm(t('common.confirmDelete'))) return
    dispatch(deleteIngredient(ingredient.id))
  }

  if (status === 'loading') return <Spinner />
  if (status === 'failed') return <Alert variant="error">{error ?? t('common.error')}</Alert>

  return (
    <div className="ingredient-list">
      <div className="ingredient-list__header">
        <h1>{t('ingredients.title')}</h1>
        <Button onClick={() => setAddMode('choice')}>
          <Plus size={16} aria-hidden />
          {t('ingredients.addIngredient')}
        </Button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder={t('ingredients.search')} />

      <table className="ingredient-list__table">
        <thead>
          <tr>
            <th>{t('ingredients.name')}</th>
            <th>{t('ingredients.category')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((ing) => (
            <tr key={ing.id}>
              <td>
                <button
                  type="button"
                  className="ingredient-list__name-btn"
                  onClick={() => setDetailIngredient(ing)}
                >
                  {localizedIngredientName(ing, language)}
                </button>
                {(ing.products?.length ?? 0) > 0 && (
                  <Badge variant="neutral">{ing.products!.length}</Badge>
                )}
              </td>
              <td>
                <span className="ingredient-list__category">
                  {t(`ingredients.categories.${ing.category}`)}
                </span>
              </td>
              <td className="ingredient-list__actions">
                <button
                  type="button"
                  className="ingredient-list__icon-btn"
                  aria-label={t('common.edit')}
                  onClick={() => setManualEdit(ing)}
                >
                  <Pencil size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  className="ingredient-list__icon-btn ingredient-list__icon-btn--danger"
                  aria-label={t('common.delete')}
                  onClick={() => handleDelete(ing)}
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={3} className="ingredient-list__empty">{t('ingredients.noResults')}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── Add choice modal ─────────────────────────────────────────────── */}
      <Modal
        open={addMode === 'choice'}
        onClose={() => setAddMode(null)}
        title={t('ingredients.addIngredient')}
      >
        <div className="ingredient-list__add-choice">
          <button
            type="button"
            className="ingredient-list__add-option"
            onClick={() => setAddMode('scan')}
          >
            <Barcode size={32} aria-hidden />
            <span className="ingredient-list__add-option-label">
              {t('ingredients.scanBarcode')}
            </span>
            <span className="ingredient-list__add-option-hint">
              {t('ingredients.scanHint')}
            </span>
          </button>
          <button
            type="button"
            className="ingredient-list__add-option"
            onClick={() => setAddMode('manual')}
          >
            <Plus size={32} aria-hidden />
            <span className="ingredient-list__add-option-label">
              {t('ingredients.addManually')}
            </span>
            <span className="ingredient-list__add-option-hint">
              {t('ingredients.addManuallyHint')}
            </span>
          </button>
        </div>
      </Modal>

      {/* ── Scan flow ────────────────────────────────────────────────────── */}
      {addMode === 'scan' && (
        <QuickScanAdd
          onClose={() => setAddMode(null)}
          onDone={(ingredientId) => {
            setAddMode(null)
            const ing = ingredients.find((i) => i.id === ingredientId)
            if (ing) setDetailIngredient(ing)
          }}
        />
      )}

      {/* ── Manual add form ──────────────────────────────────────────────── */}
      <Modal
        open={addMode === 'manual'}
        onClose={() => setAddMode(null)}
        title={t('ingredients.addIngredient')}
      >
        <IngredientForm onDone={() => setAddMode(null)} />
      </Modal>

      {/* ── Edit category modal ──────────────────────────────────────────── */}
      <Modal open={!!editingIngredient} onClose={closeEditModal} title={t('common.edit')}>
        {editingIngredient && (
          <IngredientForm ingredient={editingIngredient} onDone={closeEditModal} />
        )}
      </Modal>

      {/* ── Product detail panel ─────────────────────────────────────────── */}
      {detailIngredient && (
        <IngredientDetail
          ingredient={detailIngredient}
          onClose={() => setDetailIngredient(null)}
          onEditCategory={() => { setManualEdit(detailIngredient); setDetailIngredient(null) }}
        />
      )}
    </div>
  )
}
