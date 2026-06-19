import { createClient } from '@supabase/supabase-js'
import { apiLog } from './logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

apiLog('supabase', `URL=${supabaseUrl ?? '(not set)'} · key=${supabaseAnonKey ? '✓ set' : '✗ not set'}`)

if (!supabaseUrl || !supabaseAnonKey) {
  apiLog(
    'supabase',
    'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ' +
      'Set both in Netlify → Site settings → Environment variables and redeploy.',
  )
}

/**
 * Supabase JS client. Used by all *Api.ts modules when VITE_USE_MOCK_DATA is false.
 * The anon key is safe to expose in the browser — row-level security (RLS) controls
 * what it can actually access.
 */
export const supabase = createClient(
  supabaseUrl ?? 'http://localhost',
  supabaseAnonKey ?? 'missing',
)
