/** A signed-in user with their profile from the `profiles` table. */
export interface AuthUser {
  id: string
  email: string
  username: string
  role: 'admin' | 'user'
  aiImageRequestsUsed: number
}
