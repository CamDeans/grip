'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import AIChat from '@/components/ai/AIChat'

export default function ProjectChat() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (!id) {
          throw new Error('Project ID is required')
        }

        const response = await fetch(`/api/projects/${id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch project')
        }

        await response.json()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [id])

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <AIChat />
    </div>
  )
}
