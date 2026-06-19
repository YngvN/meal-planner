import { useEffect, useRef, useState } from 'react'

const DRAFT_PREFIX = 'hungri:draft:'

/**
 * Continuously saves `liveValue` to localStorage under `key` (debounced by
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

  // Read the saved draft once on mount.
  const [savedDraft] = useState<T | null>(() => {
    if (!enabled) return null
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  })

  // Debounced write: every time liveValue changes, schedule a save.
  useEffect(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(liveValue))
      } catch {
        // Ignore storage quota errors.
      }
    }, 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [liveValue, storageKey, enabled])

  function clearDraft() {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      localStorage.removeItem(storageKey)
    } catch { /* ignore */ }
  }

  return { savedDraft, clearDraft }
}
