'use client'

import Link from 'next/link'
import { 
  ServerIcon, 
  FolderIcon, 
  ClockIcon, 
  AlertCircleIcon,
  TerminalIcon,
  BarChart3Icon,
  Settings,
  SlidersHorizontal,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AdminDashboardLayoutProps {
  children: React.ReactNode
}

export function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const adminTabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: <BarChart3Icon className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin'
    },
    { 
      id: 'builds', 
      label: 'Build Monitor', 
      icon: <ServerIcon className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin/builds'
    },
    { 
      id: 'files', 
      label: 'File Explorer', 
      icon: <FolderIcon className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin/files'
    },
    { 
      id: 'tasks', 
      label: 'Task Manager', 
      icon: <ClockIcon className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin/tasks'
    },
    { 
      id: 'system', 
      label: 'System', 
      icon: <SlidersHorizontal className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin/system'
    },
    { 
      id: 'debug', 
      label: 'Debug Console', 
      icon: <AlertCircleIcon className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin/debug'
    },
    { 
      id: 'terminal', 
      label: 'Terminal', 
      icon: <TerminalIcon className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin/terminal'
    },
    { 
      id: 'settings', 
      label: 'Admin Settings', 
      icon: <Settings className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin/settings'
    },
    { 
      id: 'support', 
      label: 'Support Tickets', 
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      href: '/dashboard/admin/support'
    },
  ]

  return (
    <div className="flex flex-col space-y-6 w-full min-w-0">
      <div className="rounded-lg border border-border bg-background-secondary shadow-sm overflow-hidden min-w-0">
        <div className="p-6 pb-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold break-words">Admin Dashboard</h1>
              <p className="text-text-secondary text-sm break-words">
                Monitor, manage and control automation tasks and project resources
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.history.back()}
              className="shrink-0"
            >
              Back
            </Button>
          </div>
        </div>
        <div className="p-6 pt-0 min-w-0">
          <nav className="flex overflow-x-auto pb-2 -mx-1 scrollbar-thin min-w-0" aria-label="Admin sections">
            <div className="flex space-x-1 min-w-max px-1 shrink-0">
              {adminTabs.map((tab) => (
                <Link 
                  key={tab.id} 
                  href={tab.href}
                  className="inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md
                    bg-background-primary text-text-secondary border-border-default hover:bg-background-secondary
                    transition-colors duration-200"
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {children}
    </div>
  )
} 