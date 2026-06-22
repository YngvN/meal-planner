import { Pressable } from 'react-native'
import { Moon, Sun } from 'lucide-react-native'
import { useTheme } from '../hooks/useTheme'

/** Button that toggles between light and dark theme. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <Pressable
      onPress={toggleTheme}
      className="w-9 h-9 items-center justify-center rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark active:opacity-70"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark
        ? <Sun size={18} className="text-app-text dark:text-text-dark" />
        : <Moon size={18} className="text-app-text dark:text-text-dark" />
      }
    </Pressable>
  )
}
