import { redirect } from 'next/navigation'

/**
 * NextAuth and the app use /login as the sign-in page.
 * Redirect /auth/signin to /login for consistency.
 */
export default function AuthSignInPage() {
  redirect('/login')
}
