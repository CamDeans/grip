'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { openInStackBlitz } from '@/lib/stackblitzOpen'
import { Button } from '@/components/ui/Button'

/**
 * Page opened in a new tab by "Run in StackBlitz" on Preview.
 * This tab loads, then redirects to StackBlitz (newWindow: false) so the new tab becomes the StackBlitz tab.
 * The original tab stays on GRIP Preview—user keeps GRIP open and can copy errors from StackBlitz back to GRIP.
 */
export default function OpenStackBlitzPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  const ran = useRef(false)
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [retrying, setRetrying] = useState(false)

  const runOpen = () => {
    if (!projectId) return
    openInStackBlitz(projectId, { newWindow: false }).then((result) => {
      setRetrying(false)
      if (!result.ok) {
        setStatus('error')
        setErrorMessage(result.error)
      }
      // If ok, SDK redirects this tab to StackBlitz; no state update
    })
  }

  useEffect(() => {
    if (!projectId || ran.current) return
    ran.current = true
    // Small delay so layout/auth don't race with the redirect
    const t = setTimeout(runOpen, 100)
    return () => clearTimeout(t)
  }, [projectId])

  if (status === 'error') {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-destructive">{errorMessage}</p>
        <Button onClick={() => { setRetrying(true); setStatus('loading'); runOpen() }} disabled={retrying} className="gap-2">
          {retrying && <Loader2 className="h-4 w-4 animate-spin" />}
          Try again
        </Button>
        <Link
          href={`/dashboard/projects/${projectId}/preview`}
          className="text-sm text-primary hover:underline"
        >
          Back to Preview
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Opening StackBlitz in this tab…</p>
      <p className="text-xs text-muted-foreground">You’ll leave GRIP and go to StackBlitz.</p>
    </div>
  )
}
