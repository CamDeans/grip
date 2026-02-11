'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LogEntry {
  _id: string
  action: string
  userId: string
  details?: unknown
  createdAt: string
}

export default function AdminActivityLogPage() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/activity-log?limit=200')
      .then((r) => (r.ok ? r.json() : { log: [] }))
      .then((d) => setLog(d.log || []))
      .finally(() => setLoading(false))
  }, [])

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
        <h2 className="text-xl font-bold">Activity Log</h2>
        <p className="text-text-secondary text-sm">Admin portal actions for debugging and audit.</p>
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Action</th>
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((e) => (
                    <tr key={e._id} className="border-b">
                      <td className="py-2 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                      <td>{e.action}</td>
                      <td>{e.userId}</td>
                      <td className="max-w-xs truncate">{JSON.stringify(e.details || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {log.length === 0 && <p className="text-text-secondary py-4">No activity yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
