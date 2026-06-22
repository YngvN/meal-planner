import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { Camera, LoaderCircle, Upload, X } from 'lucide-react-native'
import { Button, Modal, TranslatedText } from '../../../components'
import { useLanguage } from '../../../i18n'
import { transcribeRecipePhotos } from '../aiApi'
import type { RecipeDraft } from '../types'
import { useNameFeasibility } from '../../pantry/useRecipeFeasibility'

interface Props {
  onResult: (draft: RecipeDraft) => void
  onClose: () => void
}

/** Pantry summary shown after AI scan, before handing the draft to the form. */
function PantrySummary({ draft, onContinue, onClose }: { draft: RecipeDraft; onContinue: () => void; onClose: () => void }) {
  const { t } = useLanguage()
  const names = draft.ingredients.map((i) => i.name)
  const { inStockCount, total, missingNames } = useNameFeasibility(names)

  return (
    <View className="gap-4">
      <Text className="text-base text-app-text dark:text-text-dark">
        {t('pantry.feasibility.missing', { count: String(total - inStockCount) })}
        {' · '}
        <Text className="font-semibold">{inStockCount}/{total}</Text>
        {' '}{t('pantry.inStock').toLowerCase()}
      </Text>
      {missingNames.length > 0 && (
        <View className="gap-1">
          {missingNames.map((n) => (
            <Text key={n} className="text-sm text-text-muted dark:text-text-muted-dark">• {n}</Text>
          ))}
        </View>
      )}
      <View className="flex-row gap-2">
        <Button variant="secondary" onPress={onClose}>
          <TranslatedText id="common.cancel" />
        </Button>
        <Button onPress={onContinue}>
          <TranslatedText id="recipes.form.continueToRecipe" />
        </Button>
      </View>
    </View>
  )
}

const MAX_PHOTOS = 6

/**
 * Multi-photo recipe scanner. The user captures or selects 1–6 photos
 * (one per page of a cookbook, recipe card, etc.), then taps "Scan all
 * pages". All images are sent to Claude in one request so it can combine
 * information across pages into a single recipe draft.
 */
export function RecipePhotoScanner({ onResult, onClose }: Props) {
  const { t } = useLanguage()
  const [photoUris, setPhotoUris] = useState<string[]>([])
  const [photoData, setPhotoData] = useState<Array<{ imageBase64: string; mediaType: string }>>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingDraft, setPendingDraft] = useState<RecipeDraft | null>(null)

  async function addFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
      allowsEditing: false,
    })
    if (!result.canceled && result.assets[0].base64) {
      const asset = result.assets[0]
      setPhotoUris((prev) => [...prev, asset.uri])
      setPhotoData((prev) => [...prev, { imageBase64: asset.base64!, mediaType: 'image/jpeg' }])
    }
  }

  async function addFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.8,
      allowsMultipleSelection: false,
      mediaTypes: 'images',
    })
    if (!result.canceled && result.assets[0].base64) {
      const asset = result.assets[0]
      setPhotoUris((prev) => [...prev, asset.uri])
      setPhotoData((prev) => [...prev, { imageBase64: asset.base64!, mediaType: 'image/jpeg' }])
    }
  }

  function removePhoto(idx: number) {
    setPhotoUris((prev) => prev.filter((_, i) => i !== idx))
    setPhotoData((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleScan() {
    if (!photoData.length) return
    setScanning(true)
    setError(null)
    try {
      const draft = await transcribeRecipePhotos(photoData)
      setPendingDraft(draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.recipeScanMultiError'))
    } finally {
      setScanning(false)
    }
  }

  const canAddMore = photoUris.length < MAX_PHOTOS && !scanning

  if (pendingDraft) {
    return (
      <Modal open title={t('recipes.scanRecipe')} onClose={onClose}>
        <PantrySummary
          draft={pendingDraft}
          onContinue={() => { onResult(pendingDraft); onClose() }}
          onClose={onClose}
        />
      </Modal>
    )
  }

  return (
    <Modal
      open
      title={t('recipes.scanRecipe')}
      onClose={onClose}
      footer={
        <View className="flex-row gap-2">
          <Button variant="secondary" onPress={onClose} disabled={scanning}>
            <TranslatedText id="common.cancel" />
          </Button>
          <Button onPress={handleScan} disabled={photoUris.length === 0 || scanning}>
            {scanning ? (
              <View className="flex-row items-center gap-2">
                <LoaderCircle size={16} color="#ffffff" />
                <TranslatedText id="recipes.scanningPages" vars={{ n: photoUris.length }} />
              </View>
            ) : (
              <TranslatedText id="recipes.scanPages" />
            )}
          </Button>
        </View>
      }
    >
      <View className="gap-4">
        {canAddMore && (
          <View className="flex-row gap-2">
            <Button variant="secondary" onPress={addFromCamera}>
              <Camera size={16} color="#6b7280" />
              <TranslatedText id="recipes.addPage" />
            </Button>
            <Button variant="secondary" onPress={addFromGallery}>
              <Upload size={16} color="#6b7280" />
              <TranslatedText id="common.imageUrl" />
            </Button>
          </View>
        )}

        {photoUris.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {photoUris.map((uri, idx) => (
              <View key={idx} className="relative">
                <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8 }} contentFit="cover" />
                {!scanning && (
                  <Pressable
                    onPress={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full items-center justify-center active:opacity-70"
                  >
                    <X size={10} color="#ffffff" />
                  </Pressable>
                )}
                <View className="absolute bottom-1 left-1 bg-black/60 rounded px-1">
                  <Text className="text-white text-xs">{idx + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {photoUris.length > 0 && (
          <Text className="text-xs text-text-muted dark:text-text-muted-dark">
            <TranslatedText id="recipes.pageCount" vars={{ n: photoUris.length, max: MAX_PHOTOS }} />
          </Text>
        )}

        {photoUris.length === 0 && !scanning && (
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            <TranslatedText id="recipes.scanHint" />
          </Text>
        )}

        {error && <Text className="text-sm text-error dark:text-error-dark">{error}</Text>}
      </View>
    </Modal>
  )
}
