import { Redirect } from 'expo-router'

/**
 * Profile and account management now live in Settings.
 * Redirect any bookmarked /profile links there.
 */
export function Profile() {
  return <Redirect href="/settings" />
}
