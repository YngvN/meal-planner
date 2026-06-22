import { type ReactNode } from 'react'
import { Redirect } from 'expo-router'
import { useAppSelector } from './hooks'

interface Props {
  children: ReactNode
}

/**
 * Redirects unauthenticated visitors to /login.
 * Renders nothing until the initial session-restore attempt completes so the
 * user never sees a flash of the login page on a valid refresh.
 */
export function ProtectedApp({ children }: Props) {
  const { user, initialized } = useAppSelector((s) => s.auth)

  if (!initialized) return null

  if (!user) return <Redirect href="/login" />

  return <>{children}</>
}
