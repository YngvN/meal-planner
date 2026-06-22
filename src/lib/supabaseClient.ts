import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiLog } from './logger'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined

apiLog('supabase', `URL=${supabaseUrl ?? '(not set)'} · key=${supabaseAnonKey ? '✓ set' : '✗ not set'}`)

if (!supabaseUrl || !supabaseAnonKey) {
  apiLog(
    'supabase',
    'EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
      'Set both in Netlify → Site settings → Environment variables and redeploy.',
  )
}

/**
 * Supabase JS client. Used by all *Api.ts modules when EXPO_PUBLIC_USE_MOCK_DATA is false.
 * AsyncStorage is passed as the auth storage adapter so sessions persist on
 * native (iOS/Android) as well as on web.
 * The anon key is safe to expose in the bundle — row-level security (RLS) controls
 * what it can actually access.
 */
export const supabase = createClient(
  supabaseUrl ?? 'http://localhost',
  supabaseAnonKey ?? 'missing',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
