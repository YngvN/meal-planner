import { useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DRAFT_PREFIX = 'hungri:draft:'

/**
 * Continuously saves `liveValue` to AsyncStorage under `key` (debounced by
 * `delay` ms). On mount, reads any previously saved draft and returns it.
 *
 * Usage:
 * ```ts
 * const { savedDraft, clearDraft } = useDraftPersistence('draft:recipe:new', formState)
 *
 * // On mount, if savedDraft is non-null, restore it into form state.
 * // On save or Cancel, call clearDraft().
 * ```
 *
 * File objects and other non-serialisable values should be excluded before
 * passing `liveValue` — JSON.stringify silently drops them.
 */
export function useDraftPersistence<T>(
  key: string,
  liveValue: T,
  enabled = true,
): { savedDraft: T | null; clearDraft: () => void } {
  const storageKey = DRAFT_PREFIX + key
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [savedDraft, setSavedDraft] = useState<T | null>(null)

  // Read the saved draft once on mount.
  useEffect(() => {
    if (!enabled) return
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (raw !== null) setSavedDraft(JSON.parse(raw) as T)
      })
      .catch(() => { /* ignore */ })
  }, [storageKey, enabled])

  // Debounced write: every time liveValue changes, schedule a save.
  useEffect(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(liveValue)).catch(() => {
        // Ignore storage quota errors.
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [liveValue, storageKey, enabled])

  function clearDraft() {
    if (timerRef.current) clearTimeout(timerRef.current)
    AsyncStorage.removeItem(storageKey).catch(() => { /* ignore */ })
    setSavedDraft(null)
  }

  return { savedDraft, clearDraft }
}
