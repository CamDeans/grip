import { redirect } from 'next/navigation'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'

/**
 * Admin sign-in portal: redirects to main login with callbackUrl=/dashboard/admin.
 * After login, only users with admin role can access the admin dashboard (enforced by layout + API).
 */
export default async function AdminLoginPage() {
  const session = await getServerAuthSession()

  if (session && isAdminUser(session)) {
    redirect('/dashboard/admin')
  }

  if (session) {
    redirect('/dashboard')
  }

  redirect('/login?callbackUrl=%2Fdashboard%2Fadmin')
}
