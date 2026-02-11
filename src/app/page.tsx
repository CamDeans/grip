import { redirect } from 'next/navigation'
import { getServerAuthSession } from '@/lib/auth'
import { getAppAccess } from '@/lib/access'
import { LandingPage } from '@/components/landing/LandingPage'

export default async function Home() {
  const session = await getServerAuthSession()
  if (session) {
    const access = await getAppAccess(session)
    if (access.hasAccess) redirect('/dashboard')
  }
  return <LandingPage />
}
