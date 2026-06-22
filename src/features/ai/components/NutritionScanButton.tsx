import { View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { Button } from '../../../components'
import { useLanguage } from '../../../i18n'
import { transcribeNutrition } from '../aiApi'
import type { NutritionalValues } from '../../shared/types'

interface NutritionScanButtonProps {
  /** Called with the transcribed nutrition values for the parent to pre-fill. */
  onResult: (nutrition: NutritionalValues) => void
  /** Called with a user-facing error message when transcription fails. */
  onError?: (message: string) => void
}

/**
 * Button that opens the device camera/gallery and sends the selected
 * nutrition-label photo to Claude for extraction.
 */
export function NutritionScanButton({ onResult, onError }: NutritionScanButtonProps) {
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
      const nutrition = await transcribeNutrition(asset.base64!, 'image/jpeg')
      onResult(nutrition)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : t('ai.nutritionScanError'))
    }
  }

  return (
    <Button variant="secondary" onPress={handlePress}>
      <Camera size={16} color="#6b7280" />
      {t('ai.scanNutrition')}
    </Button>
  )
}
