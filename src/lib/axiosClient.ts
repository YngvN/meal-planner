import axios from 'axios'
import { apiError, apiLog } from './logger'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// Log the effective data-layer config once at startup so it's clear in any
// environment (local / Netlify) whether the app talks to a real backend.
apiLog('api', `config → baseURL="${baseURL}" · VITE_USE_MOCK_DATA=${useMockData}`)
if (useMockData) {
  apiLog('api', 'MOCK data mode is ON — writes are in-memory only and are NOT persisted to any backend.')
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Trace every real request/response/error.
apiClient.interceptors.request.use((config) => {
  apiLog('api', `→ ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url ?? ''}`, config.data ?? '')
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    apiLog('api', `← ${response.status} ${response.config.url}`, response.data)
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
