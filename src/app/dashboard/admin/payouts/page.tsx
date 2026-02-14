'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'

interface Payout {
  _id: string
  amountCents: number
  adminShareCents: number
  appShareCents: number
  status: string
  note?: string
  createdAt: string
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchPayouts = () => {
    fetch('/api/admin/payouts')
      .then((r) => (r.ok ? r.json() : { payouts: [] }))
      .then((d) => setPayouts(d.payouts || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPayouts()
  }, [])

  const createPayout = (e: React.FormEvent) => {
    e.preventDefault()
    const cents = Math.round(parseFloat(amount) * 100)
    if (!cents || cents <= 0) return
    setSubmitting(true)
    fetch('/api/admin/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: cents, note: note.trim() || undefined }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAmount('')
          setNote('')
          fetchPayouts()
        }
      })
      .finally(() => setSubmitting(false))
  }

  const setStatus = (id: string, status: 'open' | 'closed') => {
    fetch(`/api/admin/payouts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(() => fetchPayouts())
  }

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className="animate-pulse h-64 bg-background-tertiary rounded-lg" />
      </AdminDashboardLayout>
    )
  }

  return (
    <AdminDashboardLayout>
      <div className="space-y-6 overflow-x-auto min-w-0">
        <h2 className="text-xl font-bold">Payouts (45% admin / 55% app)</h2>
        <Card>
          <CardHeader><CardTitle>Create Payout</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createPayout} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border rounded px-3 py-2 w-32 bg-background-primary"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium mb-1">Note</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional"
                  className="border rounded px-3 py-2 w-full bg-background-primary"
                />
              </div>
              <Button type="submit" disabled={submitting}>Create</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>All Payouts</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Admin (45%)</th>
                    <th className="text-left py-2">App (55%)</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p._id} className="border-b">
                      <td className="py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>${(p.amountCents / 100).toFixed(2)}</td>
                      <td>${(p.adminShareCents / 100).toFixed(2)}</td>
                      <td>${(p.appShareCents / 100).toFixed(2)}</td>
                      <td><Badge variant={p.status === 'closed' ? 'secondary' : 'default'}>{p.status}</Badge></td>
                      <td>
                        {p.status === 'open' ? (
                          <Button size="sm" variant="outline" onClick={() => setStatus(p._id, 'closed')}>Close</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setStatus(p._id, 'open')}>Reopen</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payouts.length === 0 && <p className="text-text-secondary py-4">No payouts yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
