import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, TranslatedText } from '../../components'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { loginUser, clearError } from '../../features/auth/authSlice'
import './auth.scss'

/** Standalone login page — rendered outside the sidebar shell. */
export function Login() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { status, error } = useAppSelector((s) => s.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    dispatch(clearError())
    const result = await dispatch(loginUser({ email, password }))
    if (loginUser.fulfilled.match(result)) {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <h1 className="auth-page__brand">
          <TranslatedText id="nav.appName" />
        </h1>
        <h2 className="auth-page__title">
          <TranslatedText id="auth.signIn" />
        </h2>

        <form className="auth-page__form" onSubmit={handleSubmit}>
          <Input
            id="login-email"
            label={<TranslatedText id="auth.emailLabel" />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            id="login-password"
            label={<TranslatedText id="auth.passwordLabel" />}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <p className="auth-page__error">{error}</p>}

          <Button type="submit" disabled={status === 'loading'}>
            <TranslatedText id={status === 'loading' ? 'auth.signingIn' : 'auth.signIn'} />
          </Button>
        </form>

        <div className="auth-page__footer">
          <Link to="/forgot-password">
            <TranslatedText id="auth.forgotPassword" />
          </Link>
          <span>
            <TranslatedText id="auth.noAccount" />{' '}
            <Link to="/signup">
              <TranslatedText id="auth.signUp" />
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
