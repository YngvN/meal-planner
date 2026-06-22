import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { Button } from '../../../components'
import { useLanguage } from '../../../i18n'
import { transcribeRecipe } from '../aiApi'
import type { RecipeDraft } from '../types'

interface RecipeScanButtonProps {
  /** Called with the transcribed recipe draft for the parent to apply to the form. */
  onResult: (draft: RecipeDraft) => void
  /** Called with a user-facing error message when transcription fails. */
  onError?: (message: string) => void
}

/**
 * Button that opens the device camera/gallery and sends the selected
 * recipe-page photo to Claude for extraction into a recipe draft.
 */
export function RecipeScanButton({ onResult, onError }: RecipeScanButtonProps) {
  const { t } = useLanguage()

  async function handlePress() {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.8,
      mediaTypes: 'images',
    })
    if (result.canceled || !result.assets[0].base64) return
    const asset = result.assets[0]
    try {
      const draft = await transcribeRecipe(asset.base64!, 'image/jpeg')
      onResult(draft)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : t('ai.recipeScanError'))
    }
  }

  return (
    <Button variant="secondary" onPress={handlePress}>
      <Camera size={16} color="#6b7280" />
      {t('ai.scanRecipe')}
    </Button>
  )
}
