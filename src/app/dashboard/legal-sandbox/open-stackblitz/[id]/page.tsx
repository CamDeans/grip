'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ExternalLink } from 'lucide-react'
import { openInStackBlitzLegalSandbox } from '@/lib/stackblitzOpen'
import { Button } from '@/components/ui/Button'

/**
 * Sandbox StackBlitz opener. Open this page in a NEW tab from the sandbox flow.
 * This tab shows "You're being redirected to StackBlitz" then runs the SDK so
 * this tab loads the sandbox app in StackBlitz. The GRIP sandbox tab stays open.
 *
 * Flow: Sandbox → window.open(this URL) → this page runs → this tab goes to StackBlitz.
 */
export default function SandboxOpenStackBlitzPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  const ran = useRef(false)
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [retrying, setRetrying] = useState(false)

  const runOpen = () => {
    if (!projectId) return
    openInStackBlitzLegalSandbox(projectId, { newWindow: false }).then((result) => {
      setRetrying(false)
      if (!result.ok) {
        setStatus('error')
        setErrorMessage(result.error)
      }
    })
  }

  useEffect(() => {
    if (!projectId || ran.current) return
    ran.current = true
    const t = setTimeout(runOpen, 100)
    return () => clearTimeout(t)
  }, [projectId])

  if (status === 'error') {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-destructive font-medium">{errorMessage}</p>
        <Button onClick={() => { setRetrying(true); setStatus('loading'); runOpen() }} disabled={retrying} className="gap-2">
          {retrying && <Loader2 className="h-4 w-4 animate-spin" />}
          Try again
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link href={`/dashboard/legal-sandbox/projects/${projectId}`} className="text-primary hover:underline inline-flex items-center gap-1">
            Back to Sandbox
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <h1 className="text-lg font-semibold text-text-primary">Opening StackBlitz</h1>
      <p className="text-muted-foreground font-medium">
        You’re being redirected to StackBlitz. This tab will load your sandbox app.
      </p>
      <p className="text-sm text-muted-foreground">
        StackBlitz will install dependencies and start the dev server. Your GRIP sandbox tab stays open — you can return there to edit code or chat. If you see errors in StackBlitz, copy them and paste into the sandbox chat so GRIP can fix the code.
      </p>
    </div>
  )
}
