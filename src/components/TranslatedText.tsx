import { Text } from 'react-native'
import { useLanguage } from '../i18n'

interface TranslatedTextProps {
  /** Dot-separated key into `languages.json`, e.g. "home.title". */
  id: string
  /** Values to interpolate into `{{placeholders}}` in the translation. */
  vars?: Record<string, string | number>
  className?: string
}

/**
 * Renders translated text for `id`.
 * In React Native there is no DOM, so framer-motion's cross-fade on language
 * change is dropped — text updates instantly (state-driven re-render).
 */
export function TranslatedText({ id, vars, className }: TranslatedTextProps) {
  const { t } = useLanguage()
  return <Text className={className}>{t(id, vars)}</Text>
}
