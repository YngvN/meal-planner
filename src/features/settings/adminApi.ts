import { supabase } from '../../lib/supabaseClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  maxUsers: number | null
  requireInviteCode: boolean
  aiImageRequestsPerUser: number
}

export interface InviteCode {
  id: string
  code: string
  usedBy: string | null
  createdAt: string
}

export interface UserRow {
  id: string
  username: string
  role: 'admin' | 'user'
  aiImageRequestsUsed: number
  email?: string
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapSettings(row: Record<string, unknown>): AppSettings {
  return {
    maxUsers: (row.max_users as number | null) ?? null,
    requireInviteCode: (row.require_invite_code as boolean) ?? false,
    aiImageRequestsPerUser: (row.ai_image_requests_per_user as number) ?? 10,
  }
}

function mapCode(row: Record<string, unknown>): InviteCode {
  return {
    id: row.id as string,
    code: row.code as string,
    usedBy: (row.used_by as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

function mapUser(row: Record<string, unknown>): UserRow {
  return {
    id: row.id as string,
    username: row.username as string,
    role: row.role as 'admin' | 'user',
    aiImageRequestsUsed: (row.ai_image_requests_used as number) ?? 0,
  }
}

// ─── App settings ─────────────────────────────────────────────────────────────

/** Returns the single app_settings row. */
export async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('*').single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to load app settings')
  return mapSettings(data as Record<string, unknown>)
}

/** Updates the app_settings row (admin only via RLS). */
export async function updateAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.maxUsers !== undefined) dbPatch.max_users = patch.maxUsers
  if (patch.requireInviteCode !== undefined) dbPatch.require_invite_code = patch.requireInviteCode
  if (patch.aiImageRequestsPerUser !== undefined)
    dbPatch.ai_image_requests_per_user = patch.aiImageRequestsPerUser

  const { data, error } = await supabase
    .from('app_settings')
    .update(dbPatch)
    .eq('id', 1)
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to update app settings')
  return mapSettings(data as Record<string, unknown>)
}

// ─── Invite codes ─────────────────────────────────────────────────────────────

/** Returns all invite codes (admin only via RLS). */
export async function fetchInviteCodes(): Promise<InviteCode[]> {
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapCode(r as Record<string, unknown>))
}

/** Generates a new invite code (admin only). */
export async function createInviteCode(): Promise<InviteCode> {
  const code = Math.random().toString(36).slice(2, 10).toUpperCase()
  const { data, error } = await supabase
    .from('invite_codes')
    .insert({ code })
    .select()
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create invite code')
  return mapCode(data as Record<string, unknown>)
}

/** Deletes an invite code by id (admin only). */
export async function revokeInviteCode(id: string): Promise<void> {
  const { error } = await supabase.from('invite_codes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── Users ────────────────────────────────────────────────────────────────────

/** Returns all user profiles (admin only via RLS for write; read is open). */
export async function fetchUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role, ai_image_requests_used')
    .order('created_at')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => mapUser(r as Record<string, unknown>))
}

/** Updates a user's role (admin only via RLS). */
export async function updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error(error.message)
}
