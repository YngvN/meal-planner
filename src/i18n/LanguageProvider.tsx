import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { NativeModules, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LanguageContext } from './LanguageContext'
import { availableLanguages, FALLBACK_LANGUAGE, translate, type LanguageCode } from './translate'

const STORAGE_KEY = 'language'

/** Type guard for whether `value` is one of the languages in `languages.json`. */
function isSupportedLanguage(value: string): value is LanguageCode {
  return availableLanguages.some((language) => language.code === value)
}

/** Reads the device locale to pick a matching supported language. */
function getDeviceLanguage(): LanguageCode {
  let deviceLocale = FALLBACK_LANGUAGE

  if (Platform.OS === 'ios') {
    deviceLocale =
      NativeModules.SettingsManager?.settings?.AppleLocale ??
      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ??
      FALLBACK_LANGUAGE
  } else if (Platform.OS === 'android') {
    deviceLocale = NativeModules.I18nManager?.localeIdentifier ?? FALLBACK_LANGUAGE
  } else if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    deviceLocale = navigator.language ?? FALLBACK_LANGUAGE
  }

  const code = deviceLocale.split(/[-_]/)[0]
  return isSupportedLanguage(code) ? code : FALLBACK_LANGUAGE
}

/**
 * Provides the active language, a `setLanguage` setter, and a `t`
 * translation function (see `useLanguage`) to the component tree.
 * Persists explicit language choices to AsyncStorage.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getDeviceLanguage)

  // Load persisted preference on mount (async — updates after initial render).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && isSupportedLanguage(stored)) setLanguageState(stored)
      })
      .catch(() => { /* ignore */ })
  }, [])

  const setLanguage = useCallback((next: LanguageCode) => {
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => { /* ignore */ })
    setLanguageState(next)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
