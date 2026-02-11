'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Old sandbox project page - redirects to main project view.
 * Sandbox projects now work seamlessly in the main Projects UI.
 */
export default function LegalSandboxProjectFlowPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params?.id

  useEffect(() => {
    if (projectId) {
      // Redirect to main project view where sandboxes now work seamlessly
      router.replace(`/dashboard/projects/${projectId}`)
    } else {
      router.replace('/dashboard/projects')
    }
  }, [projectId, router])

  return (
    <div className="flex items-center justify-center min-h-[200px] gap-2 text-text-secondary">
      Redirecting to project view…
    </div>
  )
}
