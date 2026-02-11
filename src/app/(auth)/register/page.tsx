import { getServerAuthSession } from '@/lib/auth'
import { getAppAccess } from '@/lib/access'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/RegisterForm'

/**
 * Registration is only allowed when coming from the plans flow (callbackUrl=/plans).
 * Direct visits to /register redirect to /plans so users cannot "complete sign up" without subscribing.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const params = await searchParams
  const callbackUrl = params.callbackUrl ?? ''
  const fromPlans = callbackUrl.includes('plans') || callbackUrl === '/plans'

  if (!fromPlans) {
    redirect('/plans')
  }

  const session = await getServerAuthSession()
  if (session) {
    const access = await getAppAccess(session)
    if (access.hasAccess) redirect('/dashboard')
    redirect('/plans')
  }

  return <RegisterForm callbackUrl={callbackUrl || '/plans'} />
}
