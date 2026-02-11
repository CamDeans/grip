'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Coins, Save } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export default function TokenLimitsPage() {
  const [adminTokenAllowance, setAdminTokenAllowance] = useState<number>(500_000)
  const [valuedTesterTokenAllowance, setValuedTesterTokenAllowance] = useState<number>(50)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      </div>
    </AdminDashboardLayout>
  )
}
