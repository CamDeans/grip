'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

export default function AdminRevenuePage() {
  const [data, setData] = useState<{
    totalRevenueCents: number
    totalPayoutCents: number
    events: { type?: string; amountCents?: number; createdAt?: string }[]
    payouts: { status?: string; amountCents?: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/revenue')
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

  const revenueByMonth: Record<string, number> = {}
  data.events.forEach((e) => {
    if ((e.type === 'invoice_paid' || e.type === 'subscription_started') && e.amountCents) {
      const key = e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 7) : 'unknown'
      revenueByMonth[key] = (revenueByMonth[key] || 0) + e.amountCents
    }
  })
  const barData = {
    labels: Object.keys(revenueByMonth).sort(),
    datasets: [{ label: 'Revenue ($)', data: Object.keys(revenueByMonth).sort().map((k) => revenueByMonth[k] / 100), backgroundColor: 'rgba(59, 130, 246, 0.5)' }],
  }
  const pieData = {
    labels: ['Revenue', 'Payouts (closed)'],
    datasets: [{ data: [data.totalRevenueCents / 100, data.totalPayoutCents / 100], backgroundColor: ['#22c55e', '#f59e0b'] }],
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 overflow-x-auto min-w-0">
        <h2 className="text-xl font-bold">Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">${(data.totalRevenueCents / 100).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Payouts (closed)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">${(data.totalPayoutCents / 100).toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="min-w-[280px] max-w-md">
            <Card>
              <CardHeader><CardTitle>Revenue vs Payouts</CardTitle></CardHeader>
              <CardContent><Pie data={pieData} /></CardContent>
            </Card>
          </div>
          <div className="flex-1 min-w-[300px]">
            <Card>
              <CardHeader><CardTitle>Revenue by month</CardTitle></CardHeader>
              <CardContent><Bar data={barData} /></CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}
