import { redirect } from 'next/navigation'
import { getServerAuthSession } from '@/lib/auth'
import { getAppAccess } from '@/lib/access'
import { isAdminUser } from '@/lib/utils/auth'
import { DashboardLayoutClient } from '@/components/dashboard/DashboardLayoutClient'

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerAuthSession()
  if (!session) redirect('/login')
  if (isAdminUser(session)) return <DashboardLayoutClient>{children}</DashboardLayoutClient>
  let access
  try {
    access = await getAppAccess(session)
  } catch {
    redirect('/plans')
  }
  if (!access!.hasAccess) redirect('/plans')
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
