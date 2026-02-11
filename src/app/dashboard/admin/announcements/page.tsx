'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface Announcement {
  _id: string
  title: string
  body?: string | null
  createdAt: string
}

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchList = () => {
    fetch('/api/admin/announcements')
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .then((d) => setList(d.announcements || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchList()
  }, [])

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTitle('')
          setBody('')
          fetchList()
        }
      })
      .finally(() => setSubmitting(false))
  }

  const remove = (id: string) => {
    fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' }).then(() => fetchList())
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
        <h2 className="text-xl font-bold">Announcements</h2>
        <p className="text-text-secondary text-sm">Shown at top of admin portal. Create/delete as reminders.</p>
        <Card>
          <CardHeader><CardTitle>Create</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="border rounded px-3 py-2 w-full max-w-md bg-background-primary" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body (optional)</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} className="border rounded px-3 py-2 w-full max-w-md bg-background-primary" rows={2} />
              </div>
              <Button type="submit" disabled={submitting}>Create</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>List</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {list.map((a) => (
                <li key={a._id} className="py-3 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    {a.body && <p className="text-sm text-text-secondary">{a.body}</p>}
                    <p className="text-xs text-text-muted">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => remove(a._id)}>Delete</Button>
                </li>
              ))}
            </ul>
            {list.length === 0 && <p className="text-text-secondary">No announcements.</p>}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
