'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { useToast } from '@/components/ui/use-toast'

export default function SupportPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [domain, setDomain] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          domain: domain.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to submit ticket',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: 'Ticket created',
        description: data.message || 'We will get back to you soon.',
      })
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      setDomain('')
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to submit. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl px-4 min-w-0 overflow-x-hidden">
      <PageHeader
        title="Contact & Support"
        description="Submit a ticket and we'll get back to you. Useful when you add a custom domain or need help."
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Create a support ticket</CardTitle>
          <CardDescription>
            Describe your issue or request. If you're setting up a custom domain on Vercel, mention it and we can help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
                Name *
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="form-input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="form-input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-text-primary mb-1">
                Subject *
              </label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief subject"
                required
                className="form-input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-text-primary mb-1">
                Domain (optional)
              </label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. app.yourdomain.com"
                className="form-input mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-text-primary mb-1">
                Message *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or request..."
                required
                rows={5}
                className="form-input mt-1.5 w-full resize-y"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit ticket'}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Back to dashboard
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
