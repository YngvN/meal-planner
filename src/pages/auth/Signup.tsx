import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, TranslatedText } from '../../components'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { signUpUser, clearError } from '../../features/auth/authSlice'
import { supabase } from '../../lib/supabaseClient'
import './auth.scss'

/** Standalone sign-up page — rendered outside the sidebar shell. */
export function Signup() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { status, error } = useAppSelector((s) => s.auth)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [requireInviteCode, setRequireInviteCode] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  // Load the invite-code setting (publicly readable) to decide whether to show the field.
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('require_invite_code')
      .single()
      .then(({ data }) => {
        if (data) setRequireInviteCode(Boolean(data.require_invite_code))
      })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
      navigate('/', { replace: true })
    }
  }

  const displayError = localError ?? error

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <h1 className="auth-page__brand">
          <TranslatedText id="nav.appName" />
        </h1>
        <h2 className="auth-page__title">
          <TranslatedText id="auth.signUp" />
        </h2>

        <form className="auth-page__form" onSubmit={handleSubmit}>
          <Input
            id="signup-username"
            label={<TranslatedText id="auth.username" />}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            id="signup-email"
            label={<TranslatedText id="auth.emailLabel" />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            id="signup-password"
            label={<TranslatedText id="auth.passwordLabel" />}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            id="signup-confirm-password"
            label={<TranslatedText id="auth.confirmPassword" />}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {requireInviteCode && (
            <Input
              id="signup-invite-code"
              label={<TranslatedText id="auth.inviteCode" />}
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
          )}

          {displayError && <p className="auth-page__error">{displayError}</p>}

          <Button type="submit" disabled={status === 'loading'}>
            <TranslatedText id={status === 'loading' ? 'auth.signingUp' : 'auth.signUp'} />
          </Button>
        </form>

        <div className="auth-page__footer">
          <span>
            <TranslatedText id="auth.alreadyHaveAccount" />{' '}
            <Link to="/login">
              <TranslatedText id="auth.signIn" />
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
