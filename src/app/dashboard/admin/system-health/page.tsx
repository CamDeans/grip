'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface Check {
  name: string
  status: 'ok' | 'error'
  message?: string
  latencyMs?: number
}

export default function AdminSystemHealthPage() {
  const [data, setData] = useState<{ ok: boolean; checks: Check[] } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHealth = () => {
    setLoading(true)
    fetch('/api/admin/system-health')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  if (loading && !data) {
    return (
      <AdminDashboardLayout>
        <div className="animate-pulse h-64 bg-background-tertiary rounded-lg" />
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 overflow-x-auto min-w-0">
        <h2 className="text-xl font-bold">System Health</h2>
        <p className="text-text-secondary text-sm">Databases and API sources. Email is sent to admin on failure when configured.</p>
        <div className="flex gap-2">
          <Button onClick={fetchHealth} disabled={loading}>Refresh</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.checks?.map((c) => (
            <Card key={c.name} className={c.status === 'error' ? 'border-destructive' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{c.name}</span>
                  <span className={c.status === 'ok' ? 'text-success' : 'text-destructive'}>{c.status}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-text-secondary">
                {c.latencyMs != null && <p>Latency: {c.latencyMs}ms</p>}
                {c.message && <p className="text-destructive">{c.message}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
        {data && !data.ok && (
          <Card className="border-destructive">
            <CardContent className="pt-4">
              <p className="text-destructive font-medium">One or more checks failed. Check the cards above and fix the reported services. Admin email notification can be configured for automatic alerts.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminDashboardLayout>
  )
}
