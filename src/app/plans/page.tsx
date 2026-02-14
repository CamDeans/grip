import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerAuthSession } from '@/lib/auth'
import { getAppAccess } from '@/lib/access'
import { PlansPageClient } from '@/components/plans/PlansPageClient'

/**
 * Plans page: choose a paid tier to access GRIP.
 * - Not signed in → redirect to /get-started so user sees the 3-step flow (create account → sign in → choose plan).
 * - Signed in and already has access (admin, subscription, valued tester) → redirect to dashboard, unless ?out=1 (out of tokens: show plans so they can upgrade or add tokens).
 * - Signed in but no access → show pricing and Subscribe CTAs (Stripe checkout).
 */
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ out?: string }>
}) {
  const session = await getServerAuthSession()
  if (!session) {
    redirect('/get-started')
  }
  const access = await getAppAccess(session)
  const params = await searchParams
  const outOfTokens = params.out === '1'
  if (access.hasAccess && !outOfTokens) {
    redirect('/dashboard')
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-primary flex items-center justify-center">Loading…</div>}>
      <PlansPageClient />
    </Suspense>
  )
}
