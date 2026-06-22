import { useState } from 'react'
import { View, Text, KeyboardAvoidingView, ScrollView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { Button, Input, TranslatedText } from '../../components'
import { resetPasswordForEmail } from '../../features/auth/authApi'

/** Sends a password-reset email via Supabase Auth. */
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setStatus('loading')
    setError(null)
    try {
      await resetPasswordForEmail(email)
      setStatus('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
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
              <TranslatedText id="auth.forgotPassword" />
            </Text>
          </View>

          {status === 'sent' ? (
            <Text className="text-center text-success dark:text-success-dark text-base">
              <TranslatedText id="auth.resetEmailSent" />
            </Text>
          ) : (
            <View className="gap-4">
              <Input
                id="forgot-email"
                label={<TranslatedText id="auth.emailLabel" />}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              {!!error && (
                <Text className="text-sm text-error dark:text-error-dark">{error}</Text>
              )}
              <Button onPress={handleSubmit} loading={status === 'loading'}>
                <TranslatedText id="auth.sendResetEmail" />
              </Button>
            </View>
          )}

          <View className="items-center">
            <Link href="/login" className="text-sm text-accent dark:text-accent-dark">
              <TranslatedText id="auth.backToSignIn" />
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
