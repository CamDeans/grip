import { redirect } from 'next/navigation'
import { getServerAuthSession } from '@/lib/auth'
import { getAppAccess } from '@/lib/access'
import { PlansPageClient } from '@/components/plans/PlansPageClient'

/**
 * Plans page: choose a paid tier to access GRIP.
 * - Not signed in → redirect to /get-started so user sees the 3-step flow (create account → sign in → choose plan).
 * - Signed in and already has access (admin, subscription, valued tester) → redirect to dashboard.
 * - Signed in but no access → show pricing and Subscribe CTAs (Stripe checkout).
 */
export default async function PlansPage() {
  const session = await getServerAuthSession()
  if (!session) {
    redirect('/get-started')
  }
  const access = await getAppAccess(session)
  if (access.hasAccess) {
    redirect('/dashboard')
  }
  return <PlansPageClient />
}
