import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ProjectService } from '@/lib/services/projectService'

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

  // Planning is automated; outcomes are in Develop → Show Context → Plan & files. Redirect so user doesn't see this page.
  redirect(`/dashboard/projects/${id}/enhanced-chat`)
}
