import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, TranslatedText } from '../../components'
import { resetPasswordForEmail } from '../../features/auth/authApi'
import './auth.scss'

/** Sends a password-reset email via Supabase Auth. */
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
    <div className="auth-page">
      <div className="auth-page__card">
        <h1 className="auth-page__brand">
          <TranslatedText id="nav.appName" />
        </h1>
        <h2 className="auth-page__title">
          <TranslatedText id="auth.forgotPassword" />
        </h2>

        {status === 'sent' ? (
          <p className="auth-page__success">
            <TranslatedText id="auth.resetEmailSent" />
          </p>
        ) : (
          <form className="auth-page__form" onSubmit={handleSubmit}>
            <Input
              id="forgot-email"
              label={<TranslatedText id="auth.emailLabel" />}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            {error && <p className="auth-page__error">{error}</p>}

            <Button type="submit" disabled={status === 'loading'}>
              <TranslatedText id="auth.sendResetEmail" />
            </Button>
          </form>
        )}

        <div className="auth-page__footer">
          <Link to="/login">
            <TranslatedText id="auth.backToSignIn" />
          </Link>
        </div>
      </div>
    </div>
  )
}
