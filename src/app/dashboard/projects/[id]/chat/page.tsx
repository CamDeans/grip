'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LoadingState } from '@/components/ui/LoadingState'

export default function ChatPageRedirect() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params?.id || ''
  
  useEffect(() => {
    if (projectId) {
      // Using setTimeout to ensure this happens after component mounts
      const redirectTimer = setTimeout(() => {
        router.replace(`/dashboard/projects/${projectId}/enhanced-chat`)
      }, 10)
      
      return () => clearTimeout(redirectTimer)
    }
  }, [projectId, router])
  
  return (
    <div className="p-4 h-full flex items-center justify-center">
      <LoadingState message="Redirecting to enhanced chat interface..." />
    </div>
  )
} 