'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminReportsPage() {
  const [data, setData] = useState<{
    summary: { totalRevenueDollars: string; totalPayoutDollars: string }
    revenueEvents: unknown[]
    payouts: unknown[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/reports')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return (
      <AdminDashboardLayout>
        <div className="animate-pulse h-64 bg-background-tertiary rounded-lg" />
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 overflow-x-auto min-w-0">
        <h2 className="text-xl font-bold">Reports (tax purposes)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Total Revenue</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">${data.summary.totalRevenueDollars}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Total Payouts (closed)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">${data.summary.totalPayoutDollars}</p></CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Revenue events</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">Export or use for tax reporting. {data.revenueEvents.length} events.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Payouts</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">Closed payouts for records. {data.payouts.length} payouts.</p>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
