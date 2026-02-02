'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { useToast } from '../providers/ToastProvider'
import { GradientTitle } from '@/components/ui/GradientTitle'

interface Analysis {
  _id: string
  projectId: string
  content: string
  status: string
  createdAt: string
}

interface AnalyticsData {
  totalProjects: number
  totalAnalyses: number
  recentAnalyses: Analysis[]
}

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const [stats, setStats] = useState(data)
  const { showToast } = useToast()

  useEffect(() => {
    const socket = new WebSocket(`ws://${window.location.host}/api/socketio`)

    socket.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data)
        setStats(newData)
        showToast('Analytics updated', 'success')
      } catch (error) {
        console.error('WebSocket error:', error)
        showToast('Failed to update analytics', 'error')
      }
    }

    return () => {
      socket.close()
    }
  }, [showToast])

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-background-secondary border border-border shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="mb-2">
                    <GradientTitle as="h4">Total Projects</GradientTitle>
                  </dt>
                  <dd className="text-lg font-medium text-text-primary">
                    {stats.totalProjects}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-background-secondary border border-border shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="mb-2">
                    <GradientTitle as="h4">Total Analyses</GradientTitle>
                  </dt>
                  <dd className="text-lg font-medium text-text-primary">
                    {stats.totalAnalyses}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background-secondary border border-border rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <GradientTitle as="h3">Recent Activity</GradientTitle>
          <div className="mt-6 flow-root">
            <ul role="list" className="-mb-8">
              {stats.recentAnalyses.map((analysis, analysisIdx) => (
                <li key={analysis._id}>
                  <div className="relative pb-8">
                    {analysisIdx !== stats.recentAnalyses.length - 1 ? (
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-border flex items-center justify-center">
                          <ClockIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-text-secondary">
                            Analysis completed
                            <span className="font-medium text-text-primary ml-1">
                              {new Date(analysis.createdAt).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              analysis.status === 'completed'
                                ? 'bg-border text-primary'
                                : 'bg-destructive/10 text-destructive'
                            }`}
                          >
                            {analysis.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
