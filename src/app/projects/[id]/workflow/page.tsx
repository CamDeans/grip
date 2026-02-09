'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LoadingState } from '@/components/ui/LoadingState'

export default function WorkflowRedirect() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params?.id || ''

  useEffect(() => {
    if (projectId) {
      router.replace(`/dashboard/projects/${projectId}/planning`)
    }
  }, [projectId, router])

  return (
    <div className="p-4 h-full flex items-center justify-center">
      <LoadingState message="Redirecting to planning..." />
    </div>
  )
}
