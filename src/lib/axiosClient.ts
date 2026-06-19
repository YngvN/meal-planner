import axios from 'axios'
import { apiError, apiLog } from './logger'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// Optional Supabase anon key — required when VITE_API_BASE_URL points to a
// Supabase PostgREST endpoint (https://xxx.supabase.co/rest/v1).
// Set VITE_SUPABASE_ANON_KEY in Netlify → Site settings → Environment variables.
const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log the effective data-layer config once at startup so it's clear in any
// environment (local / Netlify) whether the app talks to a real backend.
apiLog(
  'api',
  `config → baseURL="${baseURL}" · VITE_USE_MOCK_DATA=${useMockData} · supabaseKey=${supabaseAnonKey ? '✓ set' : '✗ not set'}`,
)
if (useMockData) {
  apiLog('api', 'MOCK data mode is ON — writes are in-memory only and are NOT persisted to any backend.')
}

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
}

// Supabase PostgREST requires apikey + Authorization on every request.
if (supabaseAnonKey) {
  defaultHeaders['apikey'] = supabaseAnonKey
  defaultHeaders['Authorization'] = `Bearer ${supabaseAnonKey}`
}

export const apiClient = axios.create({
  baseURL,
  headers: defaultHeaders,
})

// Trace every real request/response/error.
apiClient.interceptors.request.use((config) => {
  apiLog('api', `→ ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url ?? ''}`, config.data ?? '')
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    // A common misconfig: the base URL has no backend, so the host's SPA
    // fallback returns index.html with a 200. Flag it loudly.
    if (typeof response.data === 'string' && /^\s*<(!doctype|html)/i.test(response.data)) {
      apiError(
        'api',
        `✗ ${response.config.url} returned HTML, not JSON. No backend at "${baseURL}" ` +
          '(SPA fallback). Set VITE_API_BASE_URL to a real API, or VITE_USE_MOCK_DATA=true.',
      )
    } else {
      apiLog('api', `← ${response.status} ${response.config.url}`, response.data)
    }
    return response
  },
  (error) => {
    apiError(
      'api',
      `✗ ${error.config?.method?.toUpperCase() ?? ''} ${error.config?.url ?? ''}`,
      error.response?.status ?? '(no response)',
      error.message,
    )
    return Promise.reject(error)
  },
)
