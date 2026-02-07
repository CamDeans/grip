import { redirect } from 'next/navigation'
import { getServerAuthSession } from '@/lib/auth'
import { LandingPage } from '@/components/landing/LandingPage'

export default async function Home() {
  const session = await getServerAuthSession()

  if (session) {
    redirect('/dashboard')
  }

  return <LandingPage />
}
