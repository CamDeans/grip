'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface Tester {
  _id: string
  email: string
  name: string
  tokenAllowance: number
  addedAt: string
}

export default function AdminValuedTestersPage() {
  const [testers, setTesters] = useState<Tester[]>([])
  const [max, setMax] = useState(10)
  const [tokensPerMonth, setTokensPerMonth] = useState(50)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTesters = () => {
    fetch('/api/admin/valued-testers')
      .then((r) => (r.ok ? r.json() : { testers: [], max: 10, tokensPerMonth: 50 }))
      .then((d) => {
        setTesters(d.testers || [])
        setMax(d.max ?? 10)
        setTokensPerMonth(d.tokensPerMonth ?? 50)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTesters()
  }, [])

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    fetch('/api/admin/valued-testers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() || email.trim() }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setEmail('')
          setName('')
          fetchTesters()
        } else {
          alert(d.error || 'Failed')
        }
      })
      .finally(() => setSubmitting(false))
  }

  const remove = (email: string) => {
    if (!confirm(`Remove ${email} from valued testers?`)) return
    fetch(`/api/admin/valued-testers?email=${encodeURIComponent(email)}`, { method: 'DELETE' }).then(() => fetchTesters())
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
        <h2 className="text-xl font-bold">Valued Testers</h2>
        <p className="text-text-secondary text-sm">
          Max {max} testers, {tokensPerMonth} tokens/month each. Add/remove below.
        </p>
        <Card>
          <CardHeader><CardTitle>Add Valued Tester</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={add} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border rounded px-3 py-2 w-64 bg-background-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                  className="border rounded px-3 py-2 w-48 bg-background-primary"
                />
              </div>
              <Button type="submit" disabled={submitting || testers.length >= max}>Add</Button>
            </form>
            {testers.length >= max && <p className="text-amber-600 text-sm mt-2">Maximum {max} valued testers reached. Remove one to add another.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>List ({testers.length}/{max})</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {testers.map((t) => (
                <li key={t._id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{t.name || t.email}</p>
                    <p className="text-sm text-text-secondary">{t.email}</p>
                    <p className="text-xs text-text-muted">{t.tokenAllowance} tokens/month · added {new Date(t.addedAt).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => remove(t.email)}>Remove</Button>
                </li>
              ))}
            </ul>
            {testers.length === 0 && <p className="text-text-secondary">No valued testers yet.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
