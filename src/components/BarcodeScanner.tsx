import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native'
import { useState } from 'react'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Haptics from 'expo-haptics'
import { X } from 'lucide-react-native'
import { Button, TranslatedText } from '.'

interface Props {
  /** Called when a barcode is successfully decoded. */
  onDetected: (barcode: string, format: string) => void
  /** Called when the user closes the scanner without a result. */
  onCancel: () => void
}

type ScannerState = 'requesting' | 'scanning' | 'manual' | 'denied'

/**
 * Live-camera barcode scanner using expo-camera.
 * Auto-detects EAN-13, UPC-A, QR, and other common formats.
 * Falls back to a manual text input if the camera is unavailable.
 */
export function BarcodeScanner({ onDetected, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions()
  const [state, setState] = useState<ScannerState>('requesting')
  const [manualCode, setManualCode] = useState('')
  const [scanned, setScanned] = useState(false)

  // Request camera permission on first render.
  if (!permission) {
    return (
      <View className="items-center justify-center p-6 gap-4">
        <TranslatedText id="common.loading" className="text-text-muted dark:text-text-muted-dark" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View className="items-center p-6 gap-4">
        <Text className="text-center text-base text-app-text dark:text-text-dark">
          Camera access is required to scan barcodes.
        </Text>
        <Button onPress={requestPermission}>Grant camera access</Button>
        <Pressable onPress={() => setState('manual')} className="active:opacity-70">
          <Text className="text-accent dark:text-accent-dark text-sm">Enter barcode manually instead</Text>
        </Pressable>
      </View>
    )
  }

  function handleBarcodeScanned({ data, type }: { data: string; type: string }) {
    if (scanned) return
    setScanned(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { /* ignore */ })
    onDetected(data, type)
  }

  function handleManualSubmit() {
    const code = manualCode.trim()
    if (code) onDetected(code, 'MANUAL')
  }

  return (
    <View className="gap-4">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <TranslatedText id="ingredients.scanBarcode" className="text-base font-semibold text-app-text dark:text-text-dark" />
        <Pressable onPress={onCancel} className="p-1 active:opacity-70" accessibilityLabel="Close">
          <X size={18} className="text-app-text dark:text-text-dark" />
        </Pressable>
      </View>

      {/* Camera viewport */}
      {state !== 'manual' && (
        <View className="rounded-xl overflow-hidden" style={{ height: 240 }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128', 'code39'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          >
            {/* Scan-line overlay */}
            <View style={StyleSheet.absoluteFill} className="items-center justify-center">
              <View className="w-48 h-1 bg-accent dark:bg-accent-dark opacity-80 rounded-full" />
            </View>
          </CameraView>
        </View>
      )}

      {/* Manual entry */}
      <View className="gap-2">
        <TranslatedText id="ingredients.enterBarcodeManual" className="text-sm text-text-muted dark:text-text-muted-dark" />
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1 border border-border dark:border-border-dark rounded-lg px-3 py-2 text-base text-app-text dark:text-text-dark bg-bg dark:bg-bg-dark"
            placeholder="e.g. 8001120988652"
            placeholderTextColor="#6b6375"
            value={manualCode}
            onChangeText={setManualCode}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleManualSubmit}
          />
          <Button onPress={handleManualSubmit} disabled={!manualCode.trim()}>OK</Button>
        </View>
      </View>

      {/* Switch between modes */}
      {state !== 'manual' && (
        <Pressable
          onPress={() => setState('manual')}
          className="items-center active:opacity-70"
        >
          <Text className="text-sm text-accent dark:text-accent-dark">
            Enter barcode manually
          </Text>
        </Pressable>
      )}
    </View>
  )
}
