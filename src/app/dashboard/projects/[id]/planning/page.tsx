import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ProjectService } from '@/lib/services/projectService'
import { PlanGenerator } from '@/components/project/PlanGenerator'

interface ProjectPlanningPageProps {
  params: {
    id: string
  }
}

export default async function ProjectPlanningPage({ params }: ProjectPlanningPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }
  
  // Fetch project info
  const project = await ProjectService.getProjectById(params.id)
  
  if (!project) {
    redirect('/dashboard/projects')
  }
  
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
          <PlanGenerator projectId={params.id} />
        </div>
      </div>
    </div>
  )
} 