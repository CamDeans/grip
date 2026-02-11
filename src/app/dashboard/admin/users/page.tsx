'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface UserStats {
  totalUsers: number
  newThisWeek: number
  totalProjects: number
  usersWithProjects: number
  conversionRate: number
}

export default function AdminUsersPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [users, setUsers] = useState<{ _id: string; email?: string; name?: string; createdAt?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats/users?list=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setStats({
            totalUsers: d.totalUsers ?? 0,
            newThisWeek: d.newThisWeek ?? 0,
            totalProjects: d.totalProjects ?? 0,
            usersWithProjects: d.usersWithProjects ?? 0,
            conversionRate: d.conversionRate ?? 0,
          })
          setUsers(d.users || [])
        }
      })
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
        <h2 className="text-xl font-bold">Users</h2>
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Users</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{stats.totalUsers}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">New (7d)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{stats.newThisWeek}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">With Projects</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{stats.usersWithProjects}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Conversion</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{stats.conversionRate}%</p></CardContent>
            </Card>
          </div>
        )}
        <Card>
          <CardHeader><CardTitle>All Users (valued testers)</CardTitle></CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/valued-testers" className="text-primary hover:underline">
              Manage valued testers (max 10, 50 tokens/month each) →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>User list</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 100).map((u) => (
                    <tr key={u._id} className="border-b">
                      <td className="py-2">{u.email || '—'}</td>
                      <td>{u.name || '—'}</td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="text-text-secondary py-4">No users.</p>}
              {users.length > 100 && <p className="text-text-muted text-xs mt-2">Showing first 100 of {users.length}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
