'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Redirect from old sandbox URL to main project view.
 * Sandbox projects now work in the main Projects UI.
 */
export default function LegalSandboxRedirectPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  useEffect(() => {
    if (id) {
      // Redirect to main project view (sandboxes work there now)
      router.replace(`/dashboard/projects/${id}`)
    } else {
      router.replace('/dashboard/projects')
    }
  }, [id, router])

  return (
    <div className="flex items-center justify-center min-h-[200px] gap-2 text-text-secondary">
      Redirecting to project…
    </div>
  )
}
