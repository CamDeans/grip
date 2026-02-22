'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Coins } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'

type AccessData = {
  hasAccess: boolean
  isAdmin: boolean
  tier?: string
  tokenAllowance: number
  tokensUsedThisPeriod: number
  subscriptionPeriodEnd?: string | null
}

const TIER_LABELS: Record<string, string> = {
  admin: 'Admin',
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
  valued_tester: 'Valued Tester',
}

export function TokenUsage() {
  const [data, setData] = useState<AccessData | null>(null)
  const [loading, setLoading] = useState(true)
  const adminExhaustedToastShown = useRef(false)

  const refetch = useCallback(() => {
    // Cache-bust so refetch after token usage always gets fresh data (sidebar/dashboard cards stay in sync)
    fetch(`/api/me/access?t=${Date.now()}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d || null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/me/access?t=${Date.now()}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!cancelled) setData(d || null)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Refetch token usage when enhanced chat (or other AI) records new usage so numbers stay current without page refresh
  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener('grip-token-update', handler)
    return () => window.removeEventListener('grip-token-update', handler)
  }, [refetch])

  // Refetch when tab becomes visible so sidebar shows latest after switching back (e.g. from another tab)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [refetch])

  useEffect(() => {
    if (!data?.hasAccess || !data?.isAdmin) return
    const used = data.tokensUsedThisPeriod ?? 0
    const allowance = data.tokenAllowance ?? 0
    if (allowance > 0 && used >= allowance && !adminExhaustedToastShown.current) {
      adminExhaustedToastShown.current = true
      toast({
        title: 'Token limit reached',
        description: "You've reached your token limit. Request more from Admin portal → Token limits.",
        variant: 'destructive',
      })
    }
  }, [data])

  if (loading) {
    return (
      <div className="px-3 py-2 space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    )
  }
  if (!data?.hasAccess) return null

  const planLabel = TIER_LABELS[data.tier || ''] || data.tier || 'Plan'
  const used = data.tokensUsedThisPeriod ?? 0
  const allowance = data.tokenAllowance ?? 0
  const pct = allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0
  const resetsAt = data.subscriptionPeriodEnd
    ? new Date(data.subscriptionPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="px-3 py-2 rounded-md bg-background-primary/50 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1">
        <Coins className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-text-primary truncate">{planLabel}</span>
      </div>
      {allowance > 0 && (
        <>
          <p className="text-xs text-text-secondary">
            {used.toLocaleString()} / {allowance.toLocaleString()} tokens
          </p>
          {resetsAt && (
            <p className="text-[10px] text-text-muted mt-0.5">Resets {resetsAt}</p>
          )}
          <div className="mt-1.5 h-1.5 rounded-full bg-background-tertiary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
        </>
      )}
    </div>
  )
}
