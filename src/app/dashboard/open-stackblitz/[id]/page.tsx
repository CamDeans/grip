'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { openInStackBlitz } from '@/lib/stackblitzOpen'
import { Button } from '@/components/ui/Button'

/**
 * Dedicated GRIP page for opening StackBlitz. Opened in a NEW tab from chat or Preview.
 * No project tabs (Overview/Repo/Develop) — this page is standalone so the user sees only
 * "Opening StackBlitz…" then gets redirected to StackBlitz. The tab they came from (e.g. chat)
 * stays unchanged.
 *
 * Flow: Chat/Preview → window.open(this URL) → this page runs → redirects this tab to StackBlitz.
 */
export default function OpenStackBlitzStandalonePage() {
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
        <p className="text-destructive">{errorMessage}</p>
        <Button onClick={() => { setRetrying(true); setStatus('loading'); runOpen() }} disabled={retrying} className="gap-2">
          {retrying && <Loader2 className="h-4 w-4 animate-spin" />}
          Try again
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link href={`/dashboard/projects/${projectId}/enhanced-chat`} className="text-primary hover:underline">
            Back to Develop (chat)
          </Link>
          <Link href={`/dashboard/projects/${projectId}/preview`} className="text-primary hover:underline">
            Back to Preview
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-6 text-center max-w-md mx-auto">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium">Opening StackBlitz in this tab…</p>
      <p className="text-xs text-muted-foreground">
        You’ll land on StackBlitz where your project will install dependencies and start the dev server. Use the live preview to test; if you see errors, copy them into GRIP chat so GRIP can fix the code.
      </p>
    </div>
  )
}
