'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3Icon,
  Settings,
  MessageSquare,
  DollarSign,
  Users,
  Heart,
  FileText,
  Megaphone,
  RefreshCw,
  Activity,
  Shield,
  X,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'

interface AdminDashboardLayoutProps {
  children: React.ReactNode
}

interface Announcement {
  _id: string
  title: string
  body?: string | null
  createdAt: string
}

export function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    fetch('/api/admin/announcements')
      .then((r) => r.ok ? r.json() : { announcements: [] })
      .then((d) => setAnnouncements(d.announcements || []))
      .catch(() => {})
  }, [])

  const adminTabs = [
    { id: 'overview', label: 'Dashboard', icon: <BarChart3Icon className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin' },
    { id: 'revenue', label: 'Revenue', icon: <DollarSign className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/revenue' },
    { id: 'payouts', label: 'Payouts', icon: <DollarSign className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/payouts' },
    { id: 'users', label: 'Users', icon: <Users className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/users' },
    { id: 'valued-testers', label: 'Valued Testers', icon: <Heart className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/valued-testers' },
    { id: 'support', label: 'Support', icon: <MessageSquare className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/support' },
    { id: 'reports', label: 'Reports', icon: <FileText className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/reports' },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/announcements' },
    { id: 'app-updates', label: 'App Updates', icon: <RefreshCw className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/app-updates' },
    { id: 'activity', label: 'Activity Log', icon: <Activity className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/activity-log' },
    { id: 'system-health', label: 'System Health', icon: <Shield className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/system-health' },
    { id: 'token-limits', label: 'Token limits', icon: <Coins className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/token-limits' },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4 mr-2 shrink-0" />, href: '/dashboard/admin/settings' },
  ]

  const removeAnnouncement = (id: string) => {
    fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' }).then(() => {
      setAnnouncements((prev) => prev.filter((a) => a._id !== id))
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.slice(0, 3).map((a) => (
            <Card key={a._id} className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="py-3 px-4 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-text-primary">{a.title}</p>
                  {a.body && <p className="text-sm text-text-secondary mt-0.5">{a.body}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeAnnouncement(a._id)} className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-background-secondary shadow-sm overflow-hidden min-w-0">
        <div className="p-4 sm:p-6 pb-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold break-words">Admin Portal</h1>
              <p className="text-text-secondary text-sm break-words">
                Revenue, payouts, users, support, reports, and system
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.history.back()} className="shrink-0">
              Back
            </Button>
          </div>
        </div>
        <div className="px-4 sm:px-6 pb-3 min-w-0 overflow-x-auto">
          <nav className="flex overflow-x-auto pb-2 -mx-1 scrollbar-thin min-w-0" aria-label="Admin sections">
            <div className="flex flex-wrap sm:flex-nowrap gap-1 min-w-max px-1 shrink-0">
              {adminTabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className="inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md
                    bg-background-primary text-text-secondary border-border-default hover:bg-background-secondary
                    transition-colors duration-200 whitespace-nowrap"
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
