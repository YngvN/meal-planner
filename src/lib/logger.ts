/**
 * Lightweight namespaced console logging for the API and AI layers.
 * Helps trace whether calls go to mock data or the real backend, which URLs
 * are hit, and what comes back.
 */

/** Info-level log with a coloured `[scope]` prefix. */
export function apiLog(scope: string, ...args: unknown[]): void {
  console.log(`%c[${scope}]`, 'color:#646cff;font-weight:bold', ...args)
}

/** Error-level log with a `[scope]` prefix. */
export function apiError(scope: string, ...args: unknown[]): void {
  console.error(`[${scope}]`, ...args)
}
