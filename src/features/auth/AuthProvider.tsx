import { useEffect, type ReactNode } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAppDispatch } from '../../app/hooks'
import { fetchCurrentUser, loggedOut } from './authSlice'

interface Props {
  children: ReactNode
}

/**
 * Mounts Supabase's auth state listener and syncs it into Redux.
 *
 * - On mount: attempts to restore a session from localStorage.
 * - On SIGNED_IN / TOKEN_REFRESHED: loads the full profile into the store.
 * - On SIGNED_OUT: clears the Redux user.
 */
export function AuthProvider({ children }: Props) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Restore an existing session on first render (handles page refresh).
    dispatch(fetchCurrentUser())

    // Keep Redux in sync with Supabase's async auth events.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        dispatch(fetchCurrentUser())
      } else if (event === 'SIGNED_OUT') {
        dispatch(loggedOut())
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [dispatch])

  return <>{children}</>
}
