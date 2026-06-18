import { useRef, useState } from 'react'
import { Camera, LoaderCircle } from 'lucide-react'
import { Button } from '../../../components'
import { useLanguage } from '../../../i18n'
import { transcribeRecipe } from '../aiApi'
import type { RecipeDraft } from '../types'
import './NutritionScanButton.scss'

interface RecipeScanButtonProps {
  /** Called with the transcribed recipe draft for the parent to apply to the form. */
  onResult: (draft: RecipeDraft) => void
  /** Called with a user-facing error message when transcription fails. */
  onError?: (message: string) => void
}

/** Reads a File as a base64 string (without the data: prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Button + hidden file input that lets the user photograph or upload a recipe.
 * The image is sent to the AI endpoint and the structured draft is returned via `onResult`.
 */
export function RecipeScanButton({ onResult, onError }: RecipeScanButtonProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setScanning(true)
    try {
      const base64 = await fileToBase64(file)
      const draft = await transcribeRecipe(base64, file.type)
      onResult(draft)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : t('ai.recipeScanError'))
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
        {scanning ? (
          <><LoaderCircle size={16} className="icon-spin" aria-hidden /> {t('ai.scanningRecipe')}</>
        ) : (
          <><Camera size={16} aria-hidden /> {t('ai.scanRecipe')}</>
        )}
      </Button>
    </div>
  )
}
