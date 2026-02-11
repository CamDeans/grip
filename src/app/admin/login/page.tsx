import { redirect } from 'next/navigation'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'

/**
 * Admin sign-in portal: always send the user to the login page with callbackUrl=/dashboard/admin.
 * - Not logged in → login page (so they can sign in as admin).
 * - Logged in as admin → dashboard admin.
 * - Logged in as non-admin → login page (so they can sign in with admin credentials); do not send to /dashboard (which would redirect to /plans).
 */
export default async function AdminLoginPage() {
  const session = await getServerAuthSession()

  if (session && isAdminUser(session)) {
    redirect('/dashboard/admin')
  }

  redirect('/login?callbackUrl=%2Fdashboard%2Fadmin')
}
