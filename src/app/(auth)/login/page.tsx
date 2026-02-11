import { LoginForm } from '@/components/auth/LoginForm'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'

/**
 * Login page. When user arrives with callbackUrl=/dashboard/admin (Sign in as admin):
 * - If already admin → redirect to /dashboard/admin.
 * - If logged in but not admin → show login form (so they can sign out and sign in as admin);
 *   do NOT redirect to /dashboard (which would then send them to /plans).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const params = await searchParams
  const callbackUrl = params.callbackUrl ?? ''
  const isAdminCallback = callbackUrl === '/dashboard/admin' || decodeURIComponent(callbackUrl) === '/dashboard/admin'

  const session = await getServerAuthSession()

  if (session && isAdminUser(session)) {
    redirect(callbackUrl || '/dashboard')
  }

  if (session && !isAdminCallback) {
    redirect(callbackUrl || '/dashboard')
  }

  if (session && isAdminCallback) {
    return <LoginForm />
  }

  return <LoginForm />
}
