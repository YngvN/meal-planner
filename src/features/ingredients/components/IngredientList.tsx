import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Barcode, Pencil, Plus, Trash2 } from 'lucide-react-native'
import { Alert, Badge, Button, Modal, SearchBar, Spinner } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { localizedIngredientName } from '../../shared/localize'
import { deleteIngredient, fetchIngredients } from '../ingredientsSlice'
import type { Ingredient } from '../types'
import { IngredientDetail } from './IngredientDetail'
import { IngredientForm } from './IngredientForm'
import { QuickScanAdd } from './QuickScanAdd'

type AddMode = 'choice' | 'scan' | 'manual'

/**
 * Searchable ingredient library list.
 * "Add ingredient" shows a choice first: scan a barcode or fill in the form.
 * Tapping an ingredient name opens the IngredientDetail panel for managing products.
 */
export function IngredientList() {
  const dispatch = useAppDispatch()
  const { t, language } = useLanguage()
  const { items: ingredients, status, error } = useAppSelector((s) => s.ingredients)
  const params = useLocalSearchParams<{ edit?: string }>()

  const [search, setSearch] = useState('')
  const [addMode, setAddMode] = useState<AddMode | null>(null)
  const [manualEdit, setManualEdit] = useState<Ingredient | null>(null)
  const [detailIngredient, setDetailIngredient] = useState<Ingredient | null>(null)

  useEffect(() => {
    if (status === 'idle' && ingredients.length === 0) dispatch(fetchIngredients())
  }, [dispatch, status, ingredients.length])

  const editId = params.edit
  const urlEditIngredient = editId ? (ingredients.find((i) => i.id === editId) ?? null) : null
  const editingIngredient = urlEditIngredient ?? manualEdit

  function closeEditModal() {
    setManualEdit(null)
  }

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleDelete(ingredient: Ingredient) {
    dispatch(deleteIngredient(ingredient.id))
  }

  if (status === 'loading') return <Spinner />
  if (status === 'failed') return <Alert variant="error">{error ?? t('common.error')}</Alert>

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="px-4 pt-4 pb-2 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-app-text dark:text-text-dark">
            {t('ingredients.title')}
          </Text>
          <Button onPress={() => setAddMode('choice')}>
            <Plus size={16} color="#ffffff" />
          </Button>
        </View>
        <SearchBar value={search} onChange={setSearch} placeholder={t('ingredients.search')} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={
          <Text className="text-center text-text-muted dark:text-text-muted-dark py-8">
            {t('ingredients.noResults')}
          </Text>
        }
        renderItem={({ item: ing }) => (
          <View className="flex-row items-center gap-2 py-3 border-b border-border dark:border-border-dark">
            <Pressable
              onPress={() => setDetailIngredient(ing)}
              className="flex-1 flex-row items-center gap-2 active:opacity-70"
            >
              <Text className="text-base text-app-text dark:text-text-dark">
                {localizedIngredientName(ing, language)}
              </Text>
              {(ing.products?.length ?? 0) > 0 && (
                <Badge variant="neutral">{ing.products!.length}</Badge>
              )}
            </Pressable>
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              {t(`ingredients.categories.${ing.category}`)}
            </Text>
            <View className="flex-row gap-1">
              <Pressable
                onPress={() => setManualEdit(ing)}
                className="p-2 active:opacity-70"
                accessibilityLabel={t('common.edit')}
              >
                <Pencil size={15} color="#6b7280" />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(ing)}
                className="p-2 active:opacity-70"
                accessibilityLabel={t('common.delete')}
              >
                <Trash2 size={15} color="#ef4444" />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* ── Add choice modal ─────────────────────────────────────────────── */}
      <Modal
        open={addMode === 'choice'}
        onClose={() => setAddMode(null)}
        title={t('ingredients.addIngredient')}
      >
        <View className="gap-3 py-2">
          <Pressable
            className="flex-row items-center gap-3 bg-surface dark:bg-surface-dark rounded-xl p-4 border border-border dark:border-border-dark active:opacity-80"
            onPress={() => setAddMode('scan')}
          >
            <Barcode size={32} color="#7c3aed" />
            <View className="flex-1">
              <Text className="font-semibold text-app-text dark:text-text-dark">{t('ingredients.scanBarcode')}</Text>
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">{t('ingredients.scanHint')}</Text>
            </View>
          </Pressable>
          <Pressable
            className="flex-row items-center gap-3 bg-surface dark:bg-surface-dark rounded-xl p-4 border border-border dark:border-border-dark active:opacity-80"
            onPress={() => setAddMode('manual')}
          >
            <Plus size={32} color="#7c3aed" />
            <View className="flex-1">
              <Text className="font-semibold text-app-text dark:text-text-dark">{t('ingredients.addManually')}</Text>
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">{t('ingredients.addManuallyHint')}</Text>
            </View>
          </Pressable>
        </View>
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

      {/* ── Edit modal ──────────────────────────────────────────────────── */}
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
    </View>
  )
}
