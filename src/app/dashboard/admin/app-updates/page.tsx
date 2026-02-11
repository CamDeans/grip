'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface Update {
  _id: string
  message: string
  type: string
  activeUntil: string
  createdAt: string
}

export default function AdminAppUpdatesPage() {
  const [list, setList] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'downtime'>('info')
  const [submitting, setSubmitting] = useState(false)

  const fetchList = () => {
    fetch('/api/admin/app-updates')
      .then((r) => (r.ok ? r.json() : { updates: [] }))
      .then((d) => setList(d.updates || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchList()
  }, [])

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    fetch('/api/admin/app-updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim(), type }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setMessage('')
          fetchList()
        }
      })
      .finally(() => setSubmitting(false))
  }

  const remove = (id: string) => {
    fetch(`/api/admin/app-updates?id=${id}`, { method: 'DELETE' }).then(() => fetchList())
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
        <h2 className="text-xl font-bold">App Updates</h2>
        <p className="text-text-secondary text-sm">Shown as toast in main GRIP app. Use for downtime or release notes.</p>
        <Card>
          <CardHeader><CardTitle>Create</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} className="border rounded px-3 py-2 w-full max-w-md bg-background-primary" placeholder="e.g. Scheduled maintenance tonight 10pm–11pm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as 'info' | 'downtime')} className="border rounded px-3 py-2 bg-background-primary">
                  <option value="info">Info</option>
                  <option value="downtime">Downtime</option>
                </select>
              </div>
              <Button type="submit" disabled={submitting}>Create</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active / recent</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {list.map((u) => (
                <li key={u._id} className="py-3 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium">{u.message}</p>
                    <p className="text-xs text-text-muted">{u.type} · until {new Date(u.activeUntil).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => remove(u._id)}>Delete</Button>
                </li>
              ))}
            </ul>
            {list.length === 0 && <p className="text-text-secondary">No app updates.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
