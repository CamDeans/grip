'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'

export default function ExamplesPage() {
  const router = useRouter()
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Examples &amp; Templates</h1>
        <p className="text-text-secondary mt-1">
          Sample projects and starter templates for G.R.I.P.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Example projects and templates will appear here. Create a new project from the dashboard
            to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={() => router.push('/dashboard/projects/new')}>
            New Project
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs">Documentation</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
