import { useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Minus, Plus } from 'lucide-react-native'
import { Button, Checkbox, Modal, Select } from '../../../components'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { useLanguage } from '../../../i18n'
import { localizedIngredientName } from '../../shared/localize'
import { updatePantryItem } from '../pantrySlice'

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
  const [expiresAt, setExpiresAt] = useState(pantryItem?.expiresAt?.slice(0, 10) ?? '')
  const [inStock, setInStock] = useState(pantryItem?.inStock ?? false)
  const [isLow, setIsLow] = useState(pantryItem?.isLow ?? false)

  function qtyStep() { return COUNT_UNITS.has(unit) ? 1 : 10 }

  function adjustQty(delta: number) {
    const current = parseFloat(quantity) || 0
    const next = Math.max(0, current + delta)
    setQuantity(COUNT_UNITS.has(unit) ? String(next) : next.toFixed(1).replace(/\.0$/, ''))
  }

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

  // Build flat unit options for Select
  const unitOptions = [
    { value: '', label: '—' },
    ...UNIT_GROUPS.flatMap((group) =>
      group.units.map((u) => ({ value: u, label: t(`pantry.unitLabels.${u}`) })),
    ),
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={t('pantry.editItem')}
      footer={
        <View className="flex-row gap-2">
          <Button variant="secondary" onPress={onClose}>{t('common.cancel')}</Button>
          <Button onPress={handleSave}>{t('common.save')}</Button>
        </View>
      }
    >
      <View className="gap-4">
        {ingredient?.imageUrl && (
          <Image
            source={{ uri: ingredient.imageUrl }}
            style={{ width: 80, height: 80, borderRadius: 8, alignSelf: 'center' }}
            contentFit="contain"
          />
        )}

        <Text className="text-base font-semibold text-app-text dark:text-text-dark text-center">{title}</Text>

        {/* Quantity row */}
        <View className="gap-1">
          <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('pantry.quantity')}</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => adjustQty(-qtyStep())}
              className="w-10 h-10 items-center justify-center bg-surface dark:bg-surface-dark rounded-lg border border-border dark:border-border-dark active:opacity-70"
            >
              <Minus size={16} color="#6b7280" />
            </Pressable>
            <TextInput
              className="flex-1 border border-border dark:border-border-dark rounded-lg px-3 py-2 text-base text-app-text dark:text-text-dark bg-bg dark:bg-bg-dark text-center"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#6b6375"
            />
            <Pressable
              onPress={() => adjustQty(qtyStep())}
              className="w-10 h-10 items-center justify-center bg-surface dark:bg-surface-dark rounded-lg border border-border dark:border-border-dark active:opacity-70"
            >
              <Plus size={16} color="#6b7280" />
            </Pressable>
          </View>
        </View>

        {/* Unit select */}
        <Select
          label={t('pantry.unit')}
          value={unit}
          onChange={setUnit}
          options={unitOptions}
        />

        {/* Expiry date */}
        <View className="gap-1">
          <Text className="text-sm font-medium text-app-text dark:text-text-dark">{t('pantry.expiryDate')}</Text>
          <TextInput
            className="border border-border dark:border-border-dark rounded-lg px-3 py-2 text-base text-app-text dark:text-text-dark bg-bg dark:bg-bg-dark"
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#6b6375"
          />
        </View>

        {/* Toggles */}
        <View className="gap-3">
          <Checkbox
            label={t('pantry.inStock')}
            checked={inStock}
            onChange={setInStock}
          />
          <Checkbox
            label={t('pantry.low')}
            checked={isLow}
            onChange={setIsLow}
          />
        </View>
      </View>
    </Modal>
  )
}
