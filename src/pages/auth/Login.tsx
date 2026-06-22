import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, ScrollView, Platform } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Button, Input, TranslatedText } from '../../components'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { loginUser, clearError } from '../../features/auth/authSlice'

/** Standalone login page — rendered outside the sidebar shell. */
export function Login() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { status, error } = useAppSelector((s) => s.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit() {
    dispatch(clearError())
    const result = await dispatch(loginUser({ email, password }))
    if (loginUser.fulfilled.match(result)) {
      router.replace('/')
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg dark:bg-bg-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow items-center justify-center p-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-sm gap-6">
          <View className="items-center gap-2">
            <Text className="text-3xl font-extrabold text-accent dark:text-accent-dark">
              <TranslatedText id="nav.appName" />
            </Text>
            <Text className="text-xl font-semibold text-app-text dark:text-text-dark">
              <TranslatedText id="auth.signIn" />
            </Text>
          </View>

          <View className="gap-4">
            <Input
              id="login-email"
              label={<TranslatedText id="auth.emailLabel" />}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              id="login-password"
              label={<TranslatedText id="auth.passwordLabel" />}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {!!error && (
              <Text className="text-sm text-error dark:text-error-dark">{error}</Text>
            )}

            <Button onPress={handleSubmit} loading={status === 'loading'}>
              <TranslatedText id={status === 'loading' ? 'auth.signingIn' : 'auth.signIn'} />
            </Button>
          </View>

          <View className="gap-2 items-center">
            <Link href="/forgot-password" className="text-sm text-accent dark:text-accent-dark">
              <TranslatedText id="auth.forgotPassword" />
            </Link>
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              <TranslatedText id="auth.noAccount" />{' '}
              <Link href="/signup" className="text-accent dark:text-accent-dark font-medium">
                <TranslatedText id="auth.signUp" />
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
