import { useEffect, useState } from 'react'
import { View, Text, KeyboardAvoidingView, ScrollView, Platform } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { Button, Input, TranslatedText } from '../../components'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { signUpUser, clearError } from '../../features/auth/authSlice'
import { supabase } from '../../lib/supabaseClient'

/** Standalone sign-up page — rendered outside the sidebar shell. */
export function Signup() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { status, error } = useAppSelector((s) => s.auth)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [requireInviteCode, setRequireInviteCode] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('require_invite_code')
      .single()
      .then(({ data }) => {
        if (data) setRequireInviteCode(Boolean(data.require_invite_code))
      })
  }, [])

  async function handleSubmit() {
    setLocalError(null)
    dispatch(clearError())

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.')
      return
    }

    const result = await dispatch(
      signUpUser({ email, password, username, inviteCode: inviteCode || undefined }),
    )
    if (signUpUser.fulfilled.match(result)) {
      router.replace('/')
    }
  }

  const displayError = localError ?? error

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
              <TranslatedText id="auth.signUp" />
            </Text>
          </View>

          <View className="gap-4">
            <Input id="signup-username" label={<TranslatedText id="auth.username" />} value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username" />
            <Input id="signup-email" label={<TranslatedText id="auth.emailLabel" />} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Input id="signup-password" label={<TranslatedText id="auth.passwordLabel" />} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
            <Input id="signup-confirm" label={<TranslatedText id="auth.confirmPassword" />} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="password" returnKeyType="done" onSubmitEditing={handleSubmit} />
            {requireInviteCode && (
              <Input id="signup-invite" label={<TranslatedText id="auth.inviteCode" />} value={inviteCode} onChangeText={setInviteCode} />
            )}

            {!!displayError && (
              <Text className="text-sm text-error dark:text-error-dark">{displayError}</Text>
            )}

            <Button onPress={handleSubmit} loading={status === 'loading'}>
              <TranslatedText id={status === 'loading' ? 'auth.signingUp' : 'auth.signUp'} />
            </Button>
          </View>

          <View className="items-center">
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              <TranslatedText id="auth.alreadyHaveAccount" />{' '}
              <Link href="/login" className="text-accent dark:text-accent-dark font-medium">
                <TranslatedText id="auth.signIn" />
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
