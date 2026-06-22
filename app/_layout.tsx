import '../global.css'
import 'react-native-url-polyfill/auto'
import { Stack } from 'expo-router'
import { Provider } from 'react-redux'
import { store } from '../src/store/store'
import { LanguageProvider } from '../src/i18n'
import { AuthProvider } from '../src/features/auth/AuthProvider'

/**
 * Root layout. Wraps the whole app in global providers: Redux store,
 * i18n, and Supabase auth sync. Expo Router then renders either the
 * (auth) or (app) group depending on the URL.
 */
export default function RootLayout() {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </LanguageProvider>
    </Provider>
  )
}
