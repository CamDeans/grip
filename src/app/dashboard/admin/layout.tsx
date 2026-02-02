'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isAdminUser } from '@/lib/utils/auth'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.replace('/login')
      return
    }
    if (!isAdminUser(session)) {
      router.replace('/dashboard')
      return
    }
  }, [session, status, router])

  if (status === 'loading' || !session || !isAdminUser(session)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      {children}
    </div>
  )
} 