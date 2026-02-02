'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  ServerIcon, 
  FolderIcon, 
  ClockIcon, 
  TerminalIcon,
  SlidersHorizontal,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

// The G.R.I.P. Enhancement Plan Phases
const enhancementPlan = [
  {
    id: 'phase_1',
    name: 'Database Integration',
    description: 'Connect G.R.I.P. to MongoDB collections and prepare for project automation',
    status: 'completed',
    icon: <ServerIcon className="h-8 w-8 text-primary" />,
    href: '/dashboard/admin'
  },
  {
    id: 'phase_2',
    name: 'Context Enhancement',
    description: 'Modify the chat system to maintain and utilize project context',
    status: 'completed',
    icon: <FolderIcon className="h-8 w-8 text-accent-blue" />,
    href: '/dashboard/admin'
  },
  {
    id: 'phase_3',
    name: 'Project Planning Engine',
    description: 'Create system to generate project structure and development plans',
    status: 'completed',
    icon: <FolderIcon className="h-8 w-8 text-success" />,
    href: '/dashboard/admin'
  },
  {
    id: 'phase_4',
    name: 'Code Generation System',
    description: 'Build the code generation engine for creating project files',
    status: 'completed',
    icon: <FolderIcon className="h-8 w-8 text-accent-amber" />,
    href: '/dashboard/admin/files'
  },
  {
    id: 'phase_5',
    name: 'Build Automation System',
    description: 'Create the background automation system for project building',
    status: 'completed',
    icon: <ServerIcon className="h-8 w-8 text-destructive" />,
    href: '/dashboard/admin/builds'
  },
  {
    id: 'phase_6',
    name: 'Terminal Integration',
    description: 'Create virtual terminal for command execution',
    status: 'completed',
    icon: <TerminalIcon className="h-8 w-8 text-indigo-500" />,
    href: '/dashboard/admin/terminal'
  },
  {
    id: 'phase_7',
    name: 'Admin Dashboard',
    description: 'Create admin interface for monitoring automation',
    status: 'completed',
    icon: <SlidersHorizontal className="h-8 w-8 text-destructive" />,
    href: '/dashboard/admin'
  },
  {
    id: 'phase_8',
    name: 'Chat Interface Enhancement',
    description: 'Update chat UI to support development workflow',
    status: 'in_progress',
    icon: <FolderIcon className="h-8 w-8 text-teal-500" />,
    href: '/dashboard/admin'
  },
  {
    id: 'phase_9',
    name: 'Testing and Integration',
    description: 'Test the complete system and ensure smooth integration',
    status: 'in_progress',
    icon: <CheckCircleIcon className="h-8 w-8 text-violet-500" />,
    href: '/dashboard/admin'
  }
]

// Admin access sections
const adminSections = [
  {
    id: 'tasks',
    title: 'Task Manager',
    description: 'Manage automation tasks',
    icon: <ClockIcon className="h-8 w-8 text-primary" />,
    href: '/dashboard/admin/tasks'
  },
  {
    id: 'builds',
    title: 'Build Monitor',
    description: 'Monitor build status and logs',
    icon: <ServerIcon className="h-8 w-8 text-success" />,
    href: '/dashboard/admin/builds'
  },
  {
    id: 'files',
    title: 'File Explorer',
    description: 'Browse generated project files',
    icon: <FolderIcon className="h-8 w-8 text-amber-500" />,
    href: '/dashboard/admin/files'
  },
  {
    id: 'terminal',
    title: 'Terminal',
    description: 'Access the terminal interface',
    icon: <TerminalIcon className="h-8 w-8 text-indigo-500" />,
    href: '/dashboard/admin/terminal'
  },
  {
    id: 'controls',
    title: 'System Controls',
    description: 'Control system automation',
    icon: <SlidersHorizontal className="h-8 w-8 text-destructive" />,
    href: '/dashboard/admin/controls'
  }
]

export default function AdminDashboardPage() {
  const [buildStats, setBuildStats] = useState({
    total: 0,
    running: 0,
    completed: 0,
    failed: 0
  })

  const [terminalStats, setTerminalStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  })
  
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch build stats
        const buildResponse = await fetch('/api/admin/stats/builds')
        if (buildResponse.ok) {
          const buildData = await buildResponse.json()
          setBuildStats(buildData)
        }
        
        // Fetch terminal stats
        const terminalResponse = await fetch('/api/admin/stats/terminals')
        if (terminalResponse.ok) {
          const terminalData = await terminalResponse.json()
          setTerminalStats(terminalData)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">G.R.I.P. Enhancement Progress</h2>
          <p className="text-text-secondary mb-4">
            Current implementation status of the G.R.I.P. Enhancement Plan
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            {enhancementPlan.map(phase => (
              <Card key={phase.id} className={`border-l-4 ${phase.status === 'completed' ? 'border-l-success' : 'border-l-accent-amber'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {phase.icon}
                      <div>
                        <h3 className="font-semibold">{phase.name}</h3>
                        <p className="text-sm text-text-secondary">{phase.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {phase.status === 'completed' ? (
                        <>
                          <CheckCircleIcon className="h-5 w-5 text-success" />
                          <span className="text-success font-medium">Completed</span>
                        </>
                      ) : (
                        <>
                          <div className="h-5 w-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                          <span className="text-amber-600 font-medium">In Progress</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Admin Features</h2>
          <p className="text-text-secondary mb-4">
            Access all admin features to manage and monitor G.R.I.P.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map(section => (
              <Link 
                href={section.href} 
                key={section.id}
                className="block no-underline"
              >
                <div className="h-full rounded-lg border border-border bg-background-secondary shadow-sm p-6 transition-all hover:shadow-md hover:border-primary/50">
                  <div className="flex items-center mb-3">
                    {section.icon}
                    <span className="ml-2 text-xl font-semibold">{section.title}</span>
                  </div>
                  <p className="text-text-secondary text-sm">{section.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Build Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-20 bg-background-tertiary rounded"></div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <div className="text-3xl font-bold text-primary">{buildStats.total}</div>
                    <div className="text-sm text-primary">Total Builds</div>
                  </div>
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <div className="text-3xl font-bold text-success ">{buildStats.completed}</div>
                    <div className="text-sm text-success ">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{buildStats.running}</div>
                    <div className="text-sm text-amber-600 dark:text-amber-400">Running</div>
                  </div>
                  <div className="text-center p-3 bg-destructive/10 rounded-lg">
                    <div className="text-3xl font-bold text-destructive">{buildStats.failed}</div>
                    <div className="text-sm text-destructive">Failed</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Terminal Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-20 bg-background-tertiary rounded"></div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{terminalStats.total}</div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400">Total Sessions</div>
                  </div>
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <div className="text-3xl font-bold text-success ">{terminalStats.active}</div>
                    <div className="text-sm text-success ">Active</div>
                  </div>
                  <div className="text-center p-3 bg-background-tertiary rounded-lg">
                    <div className="text-3xl font-bold text-text-muted">{terminalStats.inactive}</div>
                    <div className="text-sm text-text-muted">Inactive</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminDashboardLayout>
  )
} 