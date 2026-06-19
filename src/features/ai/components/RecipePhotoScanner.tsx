import { useRef, useState } from 'react'
import { Camera, LoaderCircle, Upload, X } from 'lucide-react'
import { Button, Modal, TranslatedText } from '../../../components'
import { useLanguage } from '../../../i18n'
import { transcribeRecipePhotos } from '../aiApi'
import type { RecipeDraft } from '../types'
import './RecipePhotoScanner.scss'

interface Props {
  onResult: (draft: RecipeDraft) => void
  onClose: () => void
}

const MAX_PHOTOS = 6

/** Reads a File as a raw base64 string (no `data:` prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Multi-photo recipe scanner. The user captures or uploads 1–6 photos
 * (one per page of a cookbook, recipe card, etc.), then clicks "Scan all
 * pages". All images are sent to Claude in one request so it can combine
 * information across pages into a single recipe draft.
 */
export function RecipePhotoScanner({ onResult, onClose }: Props) {
  const { t } = useLanguage()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addFiles(files: FileList | null) {
    if (!files) return
    const toAdd = Array.from(files).slice(0, MAX_PHOTOS - photos.length)
    if (!toAdd.length) return

    const newPreviews = toAdd.map((f) => URL.createObjectURL(f))
    setPhotos((prev) => [...prev, ...toAdd])
    setPreviews((prev) => [...prev, ...newPreviews])
    setError(null)
  }

  function removePhoto(idx: number) {
    URL.revokeObjectURL(previews[idx])
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleScan() {
    if (!photos.length) return
    setScanning(true)
    setError(null)
    try {
      const images = await Promise.all(
        photos.map(async (f) => ({ imageBase64: await fileToBase64(f), mediaType: f.type })),
      )
      const draft = await transcribeRecipePhotos(images)
      onResult(draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.recipeScanMultiError'))
    } finally {
      setScanning(false)
    }
  }

  const canAddMore = photos.length < MAX_PHOTOS && !scanning

  return (
    <Modal
      open
      title={t('recipes.scanRecipe')}
      onClose={onClose}
      footer={
        <div className="recipe-photo-scanner__footer">
          <Button variant="secondary" onClick={onClose} disabled={scanning}>
            <TranslatedText id="common.cancel" />
          </Button>
          <Button onClick={handleScan} disabled={photos.length === 0 || scanning}>
            {scanning ? (
              <>
                <LoaderCircle size={16} className="icon-spin" aria-hidden />
                <TranslatedText id="recipes.scanningPages" vars={{ n: photos.length }} />
              </>
            ) : (
              <TranslatedText id="recipes.scanPages" />
            )}
          </Button>
        </div>
      }
    >
      <div className="recipe-photo-scanner">
        {/* Hidden file inputs — one for camera, one for file picker */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="recipe-photo-scanner__hidden-input"
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          multiple
          className="recipe-photo-scanner__hidden-input"
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />

        {/* Add buttons */}
        {canAddMore && (
          <div className="recipe-photo-scanner__add-buttons">
            <Button variant="secondary" onClick={() => cameraInputRef.current?.click()}>
              <Camera size={16} aria-hidden />
              <TranslatedText id="recipes.addPage" />
            </Button>
            <Button variant="secondary" onClick={() => uploadInputRef.current?.click()}>
              <Upload size={16} aria-hidden />
              <TranslatedText id="common.imageUrl" />
            </Button>
          </div>
        )}

        {/* Thumbnail grid */}
        {photos.length > 0 && (
          <>
            <div className="recipe-photo-scanner__grid">
              {previews.map((src, idx) => (
                <div key={idx} className="recipe-photo-scanner__thumb">
                  <img src={src} alt={`Page ${idx + 1}`} className="recipe-photo-scanner__thumb-img" />
                  {!scanning && (
                    <button
                      type="button"
                      className="recipe-photo-scanner__thumb-remove"
                      onClick={() => removePhoto(idx)}
                      aria-label={t('common.delete')}
                    >
                      <X size={12} aria-hidden />
                    </button>
                  )}
                  <span className="recipe-photo-scanner__thumb-label">{idx + 1}</span>
                </div>
              ))}
            </div>

            <p className="recipe-photo-scanner__count">
              <TranslatedText id="recipes.pageCount" vars={{ n: photos.length, max: MAX_PHOTOS }} />
            </p>
          </>
        )}

        {photos.length === 0 && !scanning && (
          <p className="recipe-photo-scanner__empty">
            <TranslatedText id="recipes.scanHint" />
          </p>
        )}

        {error && <p className="recipe-photo-scanner__error">{error}</p>}
      </div>
    </Modal>
  )
}
