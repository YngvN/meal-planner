import { useCallback } from 'react'
import { useColorScheme, setColorScheme, type ColorScheme } from 'nativewind'

export type Theme = 'light' | 'dark'

/**
 * Provides the active light/dark theme and a toggle.
 * Delegates to NativeWind's `useColorScheme`, which tracks the device
 * preference and allows an explicit override. Works on native and web.
 */
export function useTheme() {
  const { colorScheme, setColorScheme: nwSet } = useColorScheme()
  const theme: Theme = colorScheme === 'dark' ? 'dark' : 'light'

  const setTheme = useCallback((next: Theme) => {
    setColorScheme(next as ColorScheme)
  }, [])

  const toggleTheme = useCallback(() => {
    nwSet(theme === 'dark' ? 'light' : 'dark')
  }, [theme, nwSet])

  return { theme, setTheme, toggleTheme }
}
