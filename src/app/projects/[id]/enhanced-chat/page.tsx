'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LoadingState } from '@/components/ui/LoadingState'

export default function EnhancedChatPageRedirect() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params?.id || ''
  
  useEffect(() => {
    if (projectId) {
      const redirectTimer = setTimeout(() => {
        router.replace(`/dashboard/projects/${projectId}/enhanced-chat`)
      }, 10)
      
      return () => clearTimeout(redirectTimer)
    }
  }, [projectId, router])
  
  return (
    <div className="p-4 h-full flex items-center justify-center">
      <LoadingState message="Redirecting to enhanced project interface..." />
    </div>
  )
} 