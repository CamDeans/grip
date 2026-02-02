import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default async function RegisterPage() {
  const session = await getServerAuthSession()

  if (session) {
    redirect('/dashboard')
  }

  return <RegisterForm />
}
