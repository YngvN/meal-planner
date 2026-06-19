import { Navigate } from 'react-router-dom'

/**
 * Profile and account management now live in Settings.
 * Redirect any bookmarked /profile links there.
 */
export function Profile() {
  return <Navigate to="/settings" replace />
}
