'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3Icon,
  DollarSign,
  Users,
  Heart,
  MessageSquare,
  FileText,
  Megaphone,
  RefreshCw,
  Activity,
  Shield,
  Settings,
  Coins,
} from 'lucide-react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const adminSections = [
  { id: 'revenue', title: 'Revenue', description: 'View revenue and subscription metrics', icon: <DollarSign className="h-6 w-6 text-primary" />, href: '/dashboard/admin/revenue' },
  { id: 'payouts', title: 'Payouts', description: 'Manage payouts (45/55 split)', icon: <DollarSign className="h-6 w-6 text-accent-blue" />, href: '/dashboard/admin/payouts' },
  { id: 'users', title: 'Users', description: 'View and manage users', icon: <Users className="h-6 w-6 text-success" />, href: '/dashboard/admin/users' },
  { id: 'valued-testers', title: 'Valued Testers', description: 'Add or remove valued testers (10 max)', icon: <Heart className="h-6 w-6 text-destructive" />, href: '/dashboard/admin/valued-testers' },
  { id: 'support', title: 'Support', description: 'View and manage support tickets', icon: <MessageSquare className="h-6 w-6 text-primary" />, href: '/dashboard/admin/support' },
  { id: 'reports', title: 'Reports', description: 'View reports', icon: <FileText className="h-6 w-6 text-accent-amber" />, href: '/dashboard/admin/reports' },
  { id: 'announcements', title: 'Announcements', description: 'Create and manage announcements', icon: <Megaphone className="h-6 w-6 text-accent-teal" />, href: '/dashboard/admin/announcements' },
  { id: 'app-updates', title: 'App Updates', description: 'Push app updates (toast in main app)', icon: <RefreshCw className="h-6 w-6 text-indigo-500" />, href: '/dashboard/admin/app-updates' },
  { id: 'activity', title: 'Activity Log', description: 'View admin activity log', icon: <Activity className="h-6 w-6 text-violet-500" />, href: '/dashboard/admin/activity-log' },
  { id: 'system-health', title: 'System Health', description: 'DB and GRIP AI connectivity', icon: <Shield className="h-6 w-6 text-success" />, href: '/dashboard/admin/system-health' },
  { id: 'token-limits', title: 'Token limits', description: 'Set admin and valued-tester token allowances', icon: <Coins className="h-6 w-6 text-primary" />, href: '/dashboard/admin/token-limits' },
  { id: 'settings', title: 'Settings', description: 'Tax, password, admin settings', icon: <Settings className="h-6 w-6 text-text-muted" />, href: '/dashboard/admin/settings' },
]

export default function AdminDashboardPage() {
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    newThisWeek: 0,
    totalProjects: 0,
    usersWithProjects: 0,
    conversionRate: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats/users')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setUserStats(d))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-text-secondary text-sm">
            Revenue, payouts, users, valued testers, support, reports, announcements, app updates, activity log, system health, and settings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Link key={section.id} href={section.href} className="block no-underline">
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-background-secondary/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{section.icon}</div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{section.title}</h3>
                      <p className="text-sm text-text-secondary mt-0.5">{section.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">User Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-20 bg-background-tertiary rounded" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userStats.totalUsers}</div>
                    <div className="text-xs text-primary">Total Users</div>
                  </div>
                  <div className="text-center p-3 bg-accent-blue/10 rounded-lg">
                    <div className="text-2xl font-bold text-accent-blue">{userStats.newThisWeek}</div>
                    <div className="text-xs text-accent-blue">New (7d)</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-20 bg-background-tertiary rounded" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <div className="text-2xl font-bold text-success">{userStats.conversionRate}%</div>
                    <div className="text-xs text-success">Conversion</div>
                  </div>
                  <div className="text-center p-3 bg-background-tertiary rounded-lg">
                    <div className="text-2xl font-bold text-text-primary">{userStats.usersWithProjects}</div>
                    <div className="text-xs text-text-secondary">With Projects</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/admin/revenue" className="text-primary hover:underline text-sm font-medium">
                View revenue →
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Support</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/admin/support" className="text-primary hover:underline text-sm font-medium">
                View support tickets →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}
