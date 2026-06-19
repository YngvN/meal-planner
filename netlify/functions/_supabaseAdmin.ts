import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for use inside Netlify functions.
 * Bypasses RLS — only use for admin tasks (JWT verification, quota checks).
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? 'http://localhost',
  process.env.SUPABASE_SERVICE_KEY ?? 'missing',
)

export interface Profile {
  id: string
  username: string
  role: 'admin' | 'user'
  ai_image_requests_used: number
}

/**
 * Extracts the JWT from `Authorization: Bearer <token>`, verifies it via
 * Supabase Auth, and returns the caller's profile row.
 * Returns null if the token is missing or invalid.
 */
export async function verifyAndGetProfile(req: Request): Promise<Profile | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return null

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, username, role, ai_image_requests_used')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) return null
  return profile as Profile
}

/**
 * Returns the current value of ai_image_requests_per_user from app_settings.
 * Falls back to 10 if the row cannot be read.
 */
export async function getAiImageQuota(): Promise<number> {
  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('ai_image_requests_per_user')
    .single()
  return (data as Record<string, unknown> | null)?.ai_image_requests_per_user as number ?? 10
}

/**
 * Increments the ai_image_requests_used counter for the given profile.
 */
export async function incrementAiImageUsage(profileId: string): Promise<void> {
  await supabaseAdmin.rpc('increment_ai_image_usage', { profile_id: profileId })
    .catch(async () => {
      // rpc fallback: plain update if the function doesn't exist yet
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('ai_image_requests_used')
        .eq('id', profileId)
        .single()
      const used = ((p as Record<string, unknown> | null)?.ai_image_requests_used as number) ?? 0
      await supabaseAdmin
        .from('profiles')
        .update({ ai_image_requests_used: used + 1 })
        .eq('id', profileId)
    })
}
