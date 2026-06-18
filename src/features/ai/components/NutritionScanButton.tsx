import { useRef, useState } from 'react'
import { Button } from '../../../components'
import { useLanguage } from '../../../i18n'
import type { NutritionalValues } from '../../shared/types'
import { transcribeNutrition } from '../aiApi'
import './NutritionScanButton.scss'

interface NutritionScanButtonProps {
  /** Called with the transcribed nutrition values for the parent to pre-fill. */
  onResult: (nutrition: NutritionalValues) => void
  /** Called with a user-facing error message when transcription fails. */
  onError?: (message: string) => void
}

/** Reads a File as a base64 string (without the data: prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Button + hidden file input that lets the user photograph or upload a nutrition
 * label. The image is sent to the AI endpoint and the transcribed values are
 * returned to the parent via `onResult`.
 */
export function NutritionScanButton({ onResult, onError }: NutritionScanButtonProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so selecting the same file again re-triggers onChange
    e.target.value = ''
    if (!file) return

    setScanning(true)
    try {
      const base64 = await fileToBase64(file)
      const nutrition = await transcribeNutrition(base64, file.type)
      onResult(nutrition)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : t('ai.scanError'))
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="nutrition-scan">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="nutrition-scan__input"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
      >
        {scanning ? `⏳ ${t('ai.scanning')}` : `📷 ${t('ai.scanNutrition')}`}
      </Button>
    </div>
  )
}
