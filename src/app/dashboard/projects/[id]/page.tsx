'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { CheckCircle2, Code, Lightbulb, MessageSquare, PenTool, PuzzleIcon, ChevronRight, Book, ArrowRight, Zap, ClipboardIcon, HelpCircle, Loader2, ExternalLink } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/client-utils'
import { useRouter, useParams } from 'next/navigation'

interface Project {
  _id: string
  title: string
  description: string
  repository?: {
    owner: string
    name: string
  }
  ideation?: {
    goals: string
    targetAudience: string
    keyFeatures: string
    technicalRequirements: string
  }
  createdAt?: string
  updatedAt?: string
  completionStatus?: 'draft' | 'ready_to_export' | 'exported' | 'deployed'
  exportedRepoUrl?: string
  deployedUrl?: string
}

const steps = [
  {
    id: 1,
    title: "Ideate",
    description: "Define your project goals and requirements clearly",
    icon: Lightbulb,
    href: "#ideation"
  },
  {
    id: 2,
    title: "Plan & Design",
    description: "Structure your project and create a development plan",
    icon: PenTool,
    href: "/dashboard/projects/{id}/planning"
  },
  {
    id: 3,
    title: "Develop",
    description: "Build features with G.R.I.P.'s AI assistance",
    icon: Code,
    href: "/dashboard/projects/{id}/enhanced-chat"
  },
  {
    id: 4,
    title: "Test & Refine",
    description: "Validate functionality and enhance your project",
    icon: PuzzleIcon,
    href: "/dashboard/projects/{id}/enhanced-chat"
  }
];

export default function ProjectOverviewPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''

  const refreshProject = () => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setProject(data))
      .catch(() => {})
  }

  const handleMarkReady = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionStatus: 'ready_to_export' }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setProject((p) => p ? { ...p, completionStatus: 'ready_to_export' } : null)
      sonnerToast.success('Marked ready to export')
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleExport = async () => {
    if (!projectId || exporting) return
    setExporting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      sonnerToast.success('Exported to GitHub', { description: data.repoUrl })
      refreshProject()
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleDeploy = async () => {
    if (!projectId || deploying) return
    setDeploying(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deploy failed')
      sonnerToast.success('Deployment started', { description: data.message || data.url })
      refreshProject()
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) throw new Error('Failed to fetch project')
        const data = await response.json()
        setProject(data)
        setError(null)
      } catch (error) {
        console.error('Error fetching project:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  if (isLoading) {
    return <LoadingState message="Loading project information..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error Loading Project</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // Format dates
  const createdDate = project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'
  const updatedDate = project?.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'

  return (
    <div className="space-y-8">
      {/* Project Summary Card */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold mb-2">Project Overview</CardTitle>
          <CardDescription>
            This dashboard provides all the information and tools you need to develop your project using G.R.I.P.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Project Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-muted">Created:</span>
                  <span>{createdDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Last Updated:</span>
                  <span>{updatedDate}</span>
                </div>
                {project?.repository && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Repository:</span>
                    <span>{project.repository.owner}/{project.repository.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Quick Actions</h3>
              <div className="flex flex-col space-y-2">
                <Link href={`/dashboard/projects/${projectId}/enhanced-chat`}>
                  <Button className="w-full justify-between">
                    <span className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Open Chat Console
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href={`/dashboard/projects/${projectId}/planning`}>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center">
                      <PenTool className="w-4 h-4 mr-2" />
                      View Project Plan
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Project Ideation Summary */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">Project Ideation</CardTitle>
          <CardDescription>
            A summary of your project goals and requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {project?.ideation ? (
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Goals</h3>
                <p className="whitespace-pre-line">{project.ideation.goals}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Target Audience</h3>
                <p className="whitespace-pre-line">{project.ideation.targetAudience}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Key Features</h3>
                <p className="whitespace-pre-line">{project.ideation.keyFeatures}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Technical Requirements</h3>
                <p className="whitespace-pre-line">{project.ideation.technicalRequirements}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-text-muted">
              <p>No ideation information available. Consider enhancing your project details.</p>
              <Button variant="outline" className="mt-4">
                Update Project Details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Development Process */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">Development Process</CardTitle>
          <CardDescription>
            Follow these steps to build your project with G.R.I.P.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="relative">
              <div className="absolute left-6 top-5 bottom-5 w-0.5 bg-border"></div>
              <div className="space-y-8">
                {steps.map((step, i) => {
                  // Use a safer approach to create links with consistent patterns
                  let href = "";
                  
                  // Determine the appropriate URL based on step title
                  if (step.title === "Ideate") {
                    href = `#ideation`; // Internal anchor link
                  } else if (step.title === "Plan & Design") {
                    href = `/dashboard/projects/${projectId}/planning`;
                  } else if (step.title === "Develop") {
                    href = `/dashboard/projects/${projectId}/enhanced-chat?task=develop`;
                  } else if (step.title === "Test & Refine") {
                    href = `/dashboard/projects/${projectId}/enhanced-chat?task=test`;
                  } else {
                    // Fallback: replace {id} in the href pattern with the actual ID
                    href = step.href.replace('{id}', projectId);
                  }
                  
                  return (
                    <div key={step.id} className="relative flex items-start">
                      <div className={cn(
                        "absolute left-0 rounded-full w-12 h-12 flex items-center justify-center z-10",
                        "bg-primary/10 text-primary"
                      )}>
                        <step.icon className="w-6 h-6" />
                      </div>
                      <div className="ml-16 space-y-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold">{step.title}</h3>
                          <div className="text-xs font-medium rounded-full px-2 py-0.5 bg-primary/10 text-primary">
                            Step {step.id}
                          </div>
                        </div>
                        <p className="text-text-secondary">{step.description}</p>
                        <Link href={href} className="inline-flex items-center text-primary hover:text-primary-hover">
                          {step.title === "Ideate" ? "Jump to Ideation" : "Start this step"}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* How to Use G.R.I.P. */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">How to Use G.R.I.P.</CardTitle>
          <CardDescription>
            Tips for getting the most out of your AI development assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Zap className="text-amber-500 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Be Specific</h4>
                  <p className="text-sm text-text-secondary">
                    Provide detailed instructions about what you want to build. The more specific you are, the better G.R.I.P. can assist you.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Zap className="text-amber-500 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Ask for Explanations</h4>
                  <p className="text-sm text-text-secondary">
                    If you&apos;re unsure about something, ask G.R.I.P. to explain concepts or code snippets in detail.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Zap className="text-amber-500 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Save Important Information</h4>
                  <p className="text-sm text-text-secondary">
                    Use the planning section to document and save important aspects of your project for future reference.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* See it run & ship it */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">See it run & ship it</CardTitle>
          <CardDescription>
            Make this repo yours: explore every file, preview, export to GitHub, and deploy when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {project?.completionStatus && (
            <p className="text-sm text-text-secondary">
              Status: <span className="font-medium capitalize">{project.completionStatus.replace(/_/g, ' ')}</span>
              {project.exportedRepoUrl && (
                <span className="ml-2">
                  · <a href={project.exportedRepoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Repo <ExternalLink className="h-3 w-3" /></a>
                </span>
              )}
              {project.deployedUrl && (
                <span className="ml-2">
                  · <a href={project.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Live <ExternalLink className="h-3 w-3" /></a>
                </span>
              )}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="default"
              className="h-auto p-4 justify-start"
              onClick={() => router.push(`/dashboard/projects/${projectId}/repo`)}
            >
              <div className="flex items-start">
                <Code className="w-5 h-5 mr-3 mt-0.5" />
                <div className="text-left">
                  <div className="font-semibold">Repo Explorer</div>
                  <p className="text-sm opacity-90">
                    Browse, search, and edit every file in your linked repo
                  </p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => router.push(`/dashboard/projects/${projectId}/preview`)}
            >
              <div className="flex items-start">
                <Zap className="w-5 h-5 mr-3 mt-0.5 text-amber-500" />
                <div className="text-left">
                  <div className="font-semibold">Preview</div>
                  <p className="text-sm text-text-secondary">
                    Paste a URL or open in StackBlitz to run in browser
                  </p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={handleExport}
              disabled={exporting || !project?.repository}
            >
              <div className="flex items-start">
                {exporting ? <Loader2 className="w-5 h-5 mr-3 mt-0.5 animate-spin" /> : <ArrowRight className="w-5 h-5 mr-3 mt-0.5" />}
                <div className="text-left">
                  <div className="font-semibold">Export to my GitHub</div>
                  <p className="text-sm text-text-secondary">
                    Create your own repo from this project
                  </p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={handleDeploy}
              disabled={deploying || (!project?.repository && !project?.exportedRepoUrl)}
            >
              <div className="flex items-start">
                {deploying ? <Loader2 className="w-5 h-5 mr-3 mt-0.5 animate-spin" /> : <Zap className="w-5 h-5 mr-3 mt-0.5 text-success" />}
                <div className="text-left">
                  <div className="font-semibold">Deploy to Vercel</div>
                  <p className="text-sm text-text-secondary">
                    One-click deploy (repo must be linked to Vercel)
                  </p>
                </div>
              </div>
            </Button>
          </div>
          {project?.completionStatus === 'draft' && (
            <Button variant="ghost" size="sm" onClick={handleMarkReady}>
              Mark ready to export
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Resources and Documentation */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">Resources & Documentation</CardTitle>
          <CardDescription>
            Helpful resources to support your development journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => router.push('/docs')}
            >
              <div className="flex items-start">
                <Book className="w-5 h-5 mr-3 mt-0.5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">G.R.I.P. Documentation</div>
                  <p className="text-sm text-text-secondary">
                    Comprehensive guide to G.R.I.P.&apos;s features and capabilities
                  </p>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => router.push('/docs/best-practices')}
            >
              <div className="flex items-start">
                <Book className="w-5 h-5 mr-3 mt-0.5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Development Best Practices</div>
                  <p className="text-sm text-text-secondary">
                    Tips and techniques for efficient development workflow
                  </p>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => router.push(`/dashboard/projects/${projectId}/planning`)}
            >
              <div className="flex items-start">
                <ClipboardIcon className="w-5 h-5 mr-3 mt-0.5 text-accent-blue" />
                <div className="text-left">
                  <div className="font-semibold">Project Planning Tools</div>
                  <p className="text-sm text-text-secondary">
                    Access planning tools and templates for your project
                  </p>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => window.open('https://github.com/GRIP-organization/GRIP/issues/new', '_blank')}
            >
              <div className="flex items-start">
                <HelpCircle className="w-5 h-5 mr-3 mt-0.5 text-success" />
                <div className="text-left">
                  <div className="font-semibold">Get Support</div>
                  <p className="text-sm text-text-secondary">
                    Open a support ticket or report an issue
                  </p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
