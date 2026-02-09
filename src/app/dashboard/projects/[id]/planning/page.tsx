import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { ProjectService } from '@/lib/services/projectService'
import { getProjectPlan } from '@/lib/services/projectPlanningService'
import { PlanGenerator } from '@/components/project/PlanGenerator'
import { Button } from '@/components/ui'
import { MessageSquare } from 'lucide-react'

interface ProjectPlanningPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPlanningPage({ params }: ProjectPlanningPageProps) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const { id } = await params

  const project = await ProjectService.getProjectById(id)
  if (!project) {
    redirect('/dashboard/projects')
  }

  const plan = await getProjectPlan(id)

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Project Planning - {project.title}</h1>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-background-secondary rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">What is Project Planning?</h2>
          <p className="text-text-primary mb-4">
            The Project Planning Engine analyzes your project requirements and repository to generate
            a comprehensive development plan. It includes:
          </p>

          <ul className="list-disc pl-6 space-y-2 text-text-primary">
            <li>Project structure with recommended files and directories</li>
            <li>Development phases with specific tasks</li>
            <li>Dependency resolution to identify relationships between components</li>
            <li>Code generation preparation with templating metadata</li>
          </ul>
        </div>

        <div>
          <PlanGenerator projectId={id} />
        </div>

        {plan?.plan && (
          <div className="rounded-lg border-2 border-primary bg-primary/10 p-6">
            <h2 className="text-xl font-bold text-primary mb-2">Your next step: Start building with GRIP</h2>
            <p className="text-text-secondary mb-2">
              Your plan and phases are ready. Go to <strong>Develop</strong> to chat with GRIP and implement your build step by step.
            </p>
            <p className="text-xs text-text-muted mb-4 border-l-2 border-primary/50 pl-3">
              Before you go: GRIP works only on the current phase. When that phase is done, GRIP will route you back to the <strong>Overview</strong> page for next steps and realignment so you and GRIP stay in sync. Then you can start the next phase from there.
            </p>
            <Link href={`/dashboard/projects/${id}/enhanced-chat`}>
              <Button size="lg">
                <MessageSquare className="w-4 h-4 mr-2" />
                Go to Develop (chat with GRIP)
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 