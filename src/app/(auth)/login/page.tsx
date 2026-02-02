import { LoginForm } from '@/components/auth/LoginForm'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const session = await getServerAuthSession()

  if (session) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
