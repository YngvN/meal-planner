import { useEffect, useState } from 'react'
import { Alert, Button, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { useLanguage } from '../../../i18n'
import { deleteIngredient, fetchIngredients } from '../ingredientsSlice'
import type { Ingredient } from '../types'
import { IngredientForm } from './IngredientForm'
import './IngredientList.scss'

/**
 * Searchable ingredient library table with inline add/edit/delete.
 */
export function IngredientList() {
  const dispatch = useAppDispatch()
  const { t } = useLanguage()
  const { items: ingredients, status, error } = useAppSelector((s) => s.ingredients)

  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (status === 'idle' && ingredients.length === 0) dispatch(fetchIngredients())
  }, [dispatch, status, ingredients.length])

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

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('ingredients.search')}
      />

      {showAdd && (
        <IngredientForm
          onDone={() => setShowAdd(false)}
        />
      )}

      {editingId && (
        <IngredientForm
          ingredient={ingredients.find((i) => i.id === editingId)}
          onDone={() => setEditingId(null)}
        />
      )}

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
              <td>{ing.name}</td>
              <td><span className="ingredient-list__category">{t(`ingredients.categories.${ing.category}`)}</span></td>
              <td className="ingredient-list__actions">
                <Button variant="secondary" onClick={() => setEditingId(ing.id)}>
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
              <td colSpan={3} className="ingredient-list__empty">{t('ingredients.noResults')}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
