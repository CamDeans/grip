'use client'

import { useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Ticket {
  _id: string
  name: string
  email: string
  subject: string
  message: string
  domain?: string | null
  status: string
  createdAt: string
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch('/api/support/tickets')
        if (res.ok) {
          const data = await res.json()
          setTickets(data.tickets || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [])

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-text-secondary mt-1">
            Tickets created via the support form. Link users to <Link href="/support" className="text-primary hover:underline">/support</Link> to submit.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse h-32 bg-background-tertiary rounded" />
            ) : tickets.length === 0 ? (
              <p className="text-text-secondary">No support tickets yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((t) => (
                  <li key={t._id} className="py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-text-primary">{t.subject}</div>
                        <div className="text-sm text-text-secondary mt-1">
                          {t.name} &lt;{t.email}&gt;
                          {t.domain && (
                            <span className="ml-2 text-primary">Domain: {t.domain}</span>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary mt-2 whitespace-pre-wrap">{t.message}</p>
                        <div className="text-xs text-text-muted mt-2">
                          {new Date(t.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant={t.status === 'open' ? 'default' : 'secondary'}>
                        {t.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
}
