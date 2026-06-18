import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, Modal, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { localizedIngredientName } from '../../shared/localize'
import { deleteIngredient, fetchIngredients } from '../ingredientsSlice'
import type { Ingredient } from '../types'
import { IngredientForm } from './IngredientForm'
import './IngredientList.scss'

/**
 * Searchable ingredient library table.
 * Add/edit forms open in a modal.
 * Supports `?edit=<id>` query param to open the edit modal directly (e.g. from Home "Things to do").
 */
export function IngredientList() {
  const dispatch = useAppDispatch()
  const { t, language } = useLanguage()
  const { items: ingredients, status, error } = useAppSelector((s) => s.ingredients)
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  // Ingredient opened via the table's Edit button (local state)
  const [manualEdit, setManualEdit] = useState<Ingredient | null>(null)

  useEffect(() => {
    if (status === 'idle' && ingredients.length === 0) dispatch(fetchIngredients())
  }, [dispatch, status, ingredients.length])

  // Derive the ingredient to edit: URL param takes priority over manual button
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
        <Button onClick={() => setShowAdd(true)}>{t('ingredients.addIngredient')}</Button>
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
                {localizedIngredientName(ing, language)}
                {ing.subproducts && ing.subproducts.length > 0 && (
                  <Badge variant="neutral">{ing.subproducts.length}</Badge>
                )}
              </td>
              <td>
                <span className="ingredient-list__category">
                  {t(`ingredients.categories.${ing.category}`)}
                </span>
              </td>

              <td className="ingredient-list__actions">
                <Button variant="secondary" onClick={() => setManualEdit(ing)}>
                  {t('common.edit')}
                </Button>
                <Button variant="secondary" onClick={() => handleDelete(ing)}>
                  {t('common.delete')}
                </Button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={5} className="ingredient-list__empty">{t('ingredients.noResults')}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Add modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={t('ingredients.addIngredient')}
      >
        <IngredientForm onDone={() => setShowAdd(false)} />
      </Modal>

      {/* Edit modal — driven by URL param or table button */}
      <Modal
        open={!!editingIngredient}
        onClose={closeEditModal}
        title={t('common.edit')}
      >
        {editingIngredient && (
          <IngredientForm
            ingredient={editingIngredient}
            onDone={closeEditModal}
          />
        )}
      </Modal>
    </div>
  )
}
