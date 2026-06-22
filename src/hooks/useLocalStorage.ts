import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Cross-platform localStorage replacement backed by AsyncStorage.
 * Reads the stored value once on mount; writes are fire-and-forget.
 * The synchronous `value` state is always up-to-date in the component tree.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue)

  // Read stored value on mount.
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw !== null) setValue(JSON.parse(raw) as T)
      })
      .catch(() => { /* ignore read errors */ })
  }, [key])

  const setStoredValue = useCallback((newValue: T) => {
    setValue(newValue)
    AsyncStorage.setItem(key, JSON.stringify(newValue)).catch(() => {
      // Ignore write errors (storage full or unavailable).
    })
  }, [key])

  return [value, setStoredValue] as const
}
