'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { GradientTitle } from '@/components/ui/GradientTitle'

export default function NewProjectDetailsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')

  useEffect(() => {
    // Redirect to search page if no repository is selected
    if (!owner || !repo) {
      router.push('/dashboard/projects/new')
    }
  }, [owner, repo, router])

  if (!owner || !repo) {
    return null
  }

  return (
    <PageContainer>
      <div className="text-center">
        <GradientTitle>Project Details</GradientTitle>
        <p className="mt-2 text-sm text-text-muted">
          Tell us more about your project goals and requirements
        </p>
        <div className="mt-4 text-lg font-medium text-primary">
          {owner}/{repo}
        </div>
      </div>

      <div className="mt-8">
        <ProjectForm owner={owner} repo={repo} />
      </div>
    </PageContainer>
  )
}
