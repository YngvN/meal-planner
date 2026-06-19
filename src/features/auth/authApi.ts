import { supabase } from '../../lib/supabaseClient'
import { apiLog } from '../../lib/logger'
import type { AuthUser } from './types'

// ─── Internal helper ───────────────────────────────────────────────────────────

/**
 * Fetches the `profiles` row for the currently authenticated user and combines
 * it with the auth email to produce an `AuthUser`.
 */
async function buildAuthUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let { data: profile } = await supabase
    .from('profiles')
    .select('username, role, ai_image_requests_used')
    .eq('id', user.id)
    .single()

  // Auto-create profile row if missing (e.g. user signed up before migration ran).
  if (!profile && user.id) {
    const fallbackUsername =
      (user.user_metadata?.username as string) ?? `user_${user.id.slice(0, 8)}`
    const { data: created } = await supabase
      .from('profiles')
      .insert({ id: user.id, username: fallbackUsername, role: 'user' })
      .select('username, role, ai_image_requests_used')
      .single()
    profile = created
  }

  if (!profile) return null

  return {
    id: user.id,
    email: user.email ?? '',
    username: (profile as Record<string, unknown>).username as string,
    role: (profile as Record<string, unknown>).role as AuthUser['role'],
    aiImageRequestsUsed: ((profile as Record<string, unknown>).ai_image_requests_used as number) ?? 0,
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the currently signed-in user (from an active Supabase session), or
 * null if the user is not authenticated.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  return buildAuthUser()
}

/** Signs in with email and password. Returns the authenticated user. */
export async function login(email: string, password: string): Promise<AuthUser> {
  apiLog('auth', 'login', email)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  const user = await buildAuthUser()
  if (!user) throw new Error('Login succeeded but profile could not be loaded')
  return user
}

/** Signs up a new user. Validates an invite code first if the setting requires one. */
export async function signUp(
  email: string,
  password: string,
  username: string,
  inviteCode?: string,
): Promise<AuthUser> {
  apiLog('auth', 'signUp', email, username)

  // Check whether invite codes are required.
  const { data: settings } = await supabase
    .from('app_settings')
    .select('require_invite_code, max_users')
    .single()

  if (settings?.require_invite_code) {
    if (!inviteCode?.trim()) throw new Error('An invite code is required to sign up.')

    const { data: code, error: codeErr } = await supabase
      .from('invite_codes')
      .select('id, used_by')
      .eq('code', inviteCode.trim())
      .single()

    if (codeErr || !code) throw new Error('Invite code not found.')
    if (code.used_by) throw new Error('This invite code has already been used.')
  }

  // Check max users limit.
  if (settings?.max_users != null) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    if ((count ?? 0) >= settings.max_users)
      throw new Error('Registration is closed — the maximum number of users has been reached.')
  }

  const { data: authData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (signUpErr) throw new Error(signUpErr.message)

  // Mark the invite code as used.
  if (inviteCode?.trim() && authData.user) {
    await supabase
      .from('invite_codes')
      .update({ used_by: authData.user.id })
      .eq('code', inviteCode.trim())
      .is('used_by', null)
  }

  const user = await buildAuthUser()
  if (!user) throw new Error('Sign-up succeeded but profile could not be loaded')
  return user
}

/** Signs out the current user. */
export async function logout(): Promise<void> {
  apiLog('auth', 'logout')
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/** Updates the email address of the current user. */
export async function updateEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) throw new Error(error.message)
}

/** Updates the password of the current user. */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

/**
 * Updates the username stored in the `profiles` table.
 * Returns the updated AuthUser so Redux state can stay in sync.
 */
export async function updateUsername(newUsername: string): Promise<AuthUser> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  const updated = await buildAuthUser()
  if (!updated) throw new Error('Username updated but profile could not be reloaded')
  return updated
}

/**
 * Sends a password-reset email. Supabase redirects the user to
 * `SITE_URL/reset-password` where they can choose a new password.
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw new Error(error.message)
}

/** Subscribes to Supabase auth state changes. Returns the unsubscribe function. */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void,
): () => void {
  const { data: subscription } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.subscription.unsubscribe()
}
