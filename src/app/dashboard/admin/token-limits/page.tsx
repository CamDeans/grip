'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/input'
import { Coins, Save, RotateCcw, UserCog, Calculator } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export default function TokenLimitsPage() {
  const [adminTokenAllowance, setAdminTokenAllowance] = useState<number>(500_000)
  const [valuedTesterTokenAllowance, setValuedTesterTokenAllowance] = useState<number>(50)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resettingSelf, setResettingSelf] = useState(false)
  const [resettingUser, setResettingUser] = useState(false)
  const [userToReset, setUserToReset] = useState('')
  const [reconcileUser, setReconcileUser] = useState('')
  const [reconcileMode, setReconcileMode] = useState<'used' | 'remaining'>('remaining')
  const [reconcileValue, setReconcileValue] = useState('')
  const [reconciling, setReconciling] = useState(false)

  useEffect(() => {
    fetch('/api/admin/token-limits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.adminTokenAllowance != null) setAdminTokenAllowance(d.adminTokenAllowance)
        if (d?.valuedTesterTokenAllowance != null) setValuedTesterTokenAllowance(d.valuedTesterTokenAllowance)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleResetMyTokens = async () => {
    setResettingSelf(true)
    try {
      const res = await fetch('/api/admin/reset-tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to reset', variant: 'destructive' })
        return
      }
      toast({ title: 'Done', description: data.message ?? 'Your tokens have been reset to zero.' })
    } catch {
      toast({ title: 'Error', description: 'Failed to reset tokens', variant: 'destructive' })
    } finally {
      setResettingSelf(false)
    }
  }

  const handleResetUserTokens = async () => {
    const value = userToReset.trim()
    if (!value) {
      toast({ title: 'Enter email or user ID', variant: 'destructive' })
      return
    }
    setResettingUser(true)
    try {
      const body = /^[a-fA-F0-9]{24}$/.test(value) ? { userId: value } : { email: value }
      const res = await fetch('/api/admin/reset-tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to reset', variant: 'destructive' })
        return
      }
      toast({ title: 'Done', description: data.message ?? 'User tokens reset to zero.' })
      setUserToReset('')
    } catch {
      toast({ title: 'Error', description: 'Failed to reset tokens', variant: 'destructive' })
    } finally {
      setResettingUser(false)
    }
  }

  const handleReconcile = async () => {
    const value = reconcileUser.trim()
    const num = reconcileValue.trim() ? parseInt(reconcileValue.replace(/,/g, ''), 10) : NaN
    if (!value) {
      toast({ title: 'Enter email or user ID', variant: 'destructive' })
      return
    }
    if (!Number.isFinite(num) || num < 0) {
      toast({ title: 'Enter a valid number (used or remaining)', variant: 'destructive' })
      return
    }
    setReconciling(true)
    try {
      const body: Record<string, unknown> = /^[a-fA-F0-9]{24}$/.test(value) ? { userId: value } : { email: value }
      if (reconcileMode === 'used') body.tokensUsedThisPeriod = num
      else body.remaining = num
      const res = await fetch('/api/admin/reconcile-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to reconcile', variant: 'destructive' })
        return
      }
      toast({ title: 'Reconciled', description: data.message ?? 'Token usage updated.' })
      setReconcileValue('')
    } catch {
      toast({ title: 'Error', description: 'Failed to reconcile tokens', variant: 'destructive' })
    } finally {
      setReconciling(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/token-limits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminTokenAllowance,
          valuedTesterTokenAllowance,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' })
        return
      }
      toast({ title: 'Saved', description: 'Token limits updated.' })
      if (data.adminTokenAllowance != null) setAdminTokenAllowance(data.adminTokenAllowance)
      if (data.valuedTesterTokenAllowance != null) setValuedTesterTokenAllowance(data.valuedTesterTokenAllowance)
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Token limits
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Set monthly token allowances for the admin and for valued testers. When a user reaches their limit, they cannot use token-consuming features until the next period or until you increase their allowance here.
          </p>
        </div>

        {loading ? (
          <div className="h-32 bg-background-tertiary rounded-lg animate-pulse" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Allowances per period</CardTitle>
              <CardDescription>
                Admin and valued testers get these amounts each period (month). Subscribers get their plan allowance from Stripe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="admin-allowance">Admin token allowance (per month)</Label>
                <input
                  id="admin-allowance"
                  type="number"
                  min={0}
                  step={1000}
                  value={adminTokenAllowance}
                  onChange={(e) => setAdminTokenAllowance(Number(e.target.value) || 0)}
                  className="w-full max-w-xs rounded-md border border-border bg-background-primary px-3 py-2 text-text-primary"
                  title="Admin token allowance per month"
                  placeholder="500000"
                />
                <p className="text-xs text-text-muted">
                  When the admin reaches this limit, they see a toast and must request more from this page (or increase the value here).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valued-allowance">Valued tester token allowance (per month)</Label>
                <input
                  id="valued-allowance"
                  type="number"
                  min={0}
                  step={1}
                  value={valuedTesterTokenAllowance}
                  onChange={(e) => setValuedTesterTokenAllowance(Number(e.target.value) || 0)}
                  className="w-full max-w-xs rounded-md border border-border bg-background-primary px-3 py-2 text-text-primary"
                  title="Valued tester token allowance per month"
                  placeholder="50"
                />
                <p className="text-xs text-text-muted">
                  Each valued tester gets this many tokens per month. Max 10 valued testers (managed in Valued Testers).
                </p>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save limits'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Quick response: token reset (area of assurance)
            </CardTitle>
            <CardDescription>
              Reset tokens to zero for your admin account or for a real user when token/access errors occur. Use this to respond quickly without changing allowances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetMyTokens} disabled={resettingSelf}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {resettingSelf ? 'Resetting…' : 'Reset my tokens to zero'}
              </Button>
              <span className="text-xs text-text-muted">Resets your admin account usage for this period.</span>
            </div>
            <div className="pt-2 border-t border-border space-y-2">
              <Label htmlFor="user-to-reset">Reset tokens for another user (email or user ID)</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="user-to-reset"
                  type="text"
                  placeholder="user@example.com or 24-char MongoDB _id"
                  value={userToReset}
                  onChange={(e) => setUserToReset(e.target.value)}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={handleResetUserTokens} disabled={resettingUser || !userToReset.trim()}>
                  {resettingUser ? 'Resetting…' : 'Reset user tokens'}
                </Button>
              </div>
              <p className="text-xs text-text-muted">Use when a real user reports token or access errors so they can continue without waiting for period reset.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Reconcile token usage
            </CardTitle>
            <CardDescription>
              Set a user&apos;s recorded usage so GRIP matches actual usage (e.g. from Claude console). Use when tracking is out of sync (e.g. after undercount from concurrent requests) so remaining = allowance − used is correct for real users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reconcile-user">User (email or user ID)</Label>
              <Input
                id="reconcile-user"
                type="text"
                placeholder="user@example.com or 24-char MongoDB _id"
                value={reconcileUser}
                onChange={(e) => setReconcileUser(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label id="reconcile-mode-label">Set by</Label>
              <div className="flex gap-4" role="radiogroup" aria-labelledby="reconcile-mode-label">
                <label htmlFor="reconcile-mode-remaining" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="reconcile-mode-remaining"
                    type="radio"
                    name="reconcile-mode"
                    checked={reconcileMode === 'remaining'}
                    onChange={() => setReconcileMode('remaining')}
                    className="rounded border-border"
                    aria-label="Set by remaining tokens"
                  />
                  <span className="text-sm">Remaining</span>
                </label>
                <label htmlFor="reconcile-mode-used" className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="reconcile-mode-used"
                    type="radio"
                    name="reconcile-mode"
                    checked={reconcileMode === 'used'}
                    onChange={() => setReconcileMode('used')}
                    className="rounded border-border"
                    aria-label="Set by tokens used this period"
                  />
                  <span className="text-sm">Used this period</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reconcile-value">
                {reconcileMode === 'remaining' ? 'Remaining tokens (e.g. from GRIP UI)' : 'Tokens used this period (e.g. from Claude console)'}
              </Label>
              <Input
                id="reconcile-value"
                type="text"
                inputMode="numeric"
                placeholder={reconcileMode === 'remaining' ? '68145000' : '2185820'}
                value={reconcileValue}
                onChange={(e) => setReconcileValue(e.target.value)}
                className="max-w-xs font-mono"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleReconcile} disabled={reconciling || !reconcileUser.trim() || !reconcileValue.trim()}>
              {reconciling ? 'Reconciling…' : 'Reconcile'}
            </Button>
            <p className="text-xs text-text-muted">
              Example: if Claude shows 2,185,820 used today and GRIP shows 68,364,509 left (allowance 70M), set &quot;Remaining&quot; to 67,814,180 so used = 70M − 67,814,180 = 2,185,820.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
