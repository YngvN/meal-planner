import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { type Exception, type Result } from '@zxing/library'
import { X } from 'lucide-react'
import { Button, TranslatedText } from '.'
import './BarcodeScanner.scss'

interface Props {
  /** Called when a barcode is successfully decoded. */
  onDetected: (barcode: string, format: string) => void
  /** Called when the user closes the scanner without a result. */
  onCancel: () => void
}

type ScannerState = 'starting' | 'scanning' | 'manual'

/**
 * Live-camera barcode scanner that auto-detects EAN-13, UPC-A, QR, and other
 * common formats using @zxing/browser. No button press required — the scanner
 * fires as soon as a barcode is in frame.
 *
 * Falls back to a manual text input if the camera is unavailable.
 */
export function BarcodeScanner({ onDetected, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [state, setState] = useState<ScannerState>('starting')
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    let active = true

    async function startScanning() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!active || !videoRef.current) return

        const reader = new BrowserMultiFormatReader()
        setState('scanning')

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result: Result | undefined, _err: Exception | undefined, ctrl: IScannerControls) => {
            if (!active || !result) return
            ctrl.stop()
            if (navigator.vibrate) navigator.vibrate(200)
            onDetected(result.getText(), result.getBarcodeFormat().toString())
          },
        )

        controlsRef.current = controls
      } catch {
        if (!active) return
        setState('manual')
      }
    }

    startScanning()

    return () => {
      active = false
      controlsRef.current?.stop()
    }
  }, [onDetected])

  function handleManualSubmit() {
    const code = manualCode.trim()
    if (code) onDetected(code, 'MANUAL')
  }

  function switchToManual() {
    controlsRef.current?.stop()
    setState('manual')
  }

  return (
    <div className="barcode-scanner">
      <div className="barcode-scanner__header">
        <span className="barcode-scanner__title">
          <TranslatedText id="ingredients.scanBarcode" />
        </span>
        <button type="button" className="barcode-scanner__close" onClick={onCancel} aria-label="Close">
          <X size={18} aria-hidden />
        </button>
      </div>

      {(state === 'starting' || state === 'scanning') && (
        <div className="barcode-scanner__viewport">
          <video ref={videoRef} className="barcode-scanner__video" muted playsInline />
          <div className="barcode-scanner__overlay">
            <div className="barcode-scanner__scan-line" />
          </div>
          {state === 'starting' && (
            <div className="barcode-scanner__loading">
              <TranslatedText id="common.loading" />
            </div>
          )}
        </div>
      )}

      <div className="barcode-scanner__manual">
        <label htmlFor="barcode-manual" className="barcode-scanner__manual-label">
          <TranslatedText id="ingredients.enterBarcodeManual" />
        </label>
        <div className="barcode-scanner__manual-row">
          <input
            id="barcode-manual"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 8001120988652"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            className="barcode-scanner__manual-input"
          />
          <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
            OK
          </Button>
        </div>
      </div>

      {state !== 'manual' && (
        <button type="button" className="barcode-scanner__switch-manual" onClick={switchToManual}>
          <TranslatedText id="ingredients.enterBarcodeManual" />
        </button>
      )}
    </div>
  )
}
