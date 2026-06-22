import { Stack } from 'expo-router'

/** Auth screens (login, signup, forgot-password) — no sidebar/navigation shell. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
