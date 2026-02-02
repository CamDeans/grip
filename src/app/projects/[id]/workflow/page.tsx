'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircleIcon, CircleIcon, AlertCircleIcon, ChevronRightIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui'
import Link from 'next/link'

// Phase 8, Step 1: Project Workflow View

export default function ProjectWorkflowPage() {
  const params = useParams()
  // Safety check and fallback for the params
  const projectId = params && typeof params.id === 'string' ? params.id : ''
  
  const [projectState, setProjectState] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchProjectState = async () => {
      if (!projectId) return
      
      try {
        const response = await fetch(`/api/projects/${projectId}/state`)
        if (response.ok) {
          const data = await response.json()
          setProjectState(data)
        } else {
          setError('Failed to load project workflow')
        }
      } catch (err) {
        console.error('Error fetching project state:', err)
        setError('Failed to load project workflow')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProjectState()
  }, [projectId])
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-success" />
      case 'in_progress':
        return <CircleIcon className="h-5 w-5 text-primary animate-pulse" />
      case 'failed':
        return <AlertCircleIcon className="h-5 w-5 text-destructive" />
      default:
        return <CircleIcon className="h-5 w-5 text-text-muted" />
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent" />
        <span className="ml-2">Loading project workflow...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-destructive mb-4">{error}</p>
        <Link href={`/projects/${projectId}`}>
          <Button>Return to Project</Button>
        </Link>
      </div>
    )
  }
  
  if (!projectState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="mb-4">No workflow data available</p>
        <Link href={`/projects/${projectId}`}>
          <Button>Return to Project</Button>
        </Link>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Workflow</h1>
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline">Return to Project</Button>
        </Link>
      </div>
      
      <div className="space-y-8">
        {projectState.phases.map((phase: any, phaseIndex: number) => (
          <div key={phaseIndex} className="border rounded-lg p-6 bg-background-secondary">
            <div className="flex items-center gap-2 mb-4">
              {getStatusIcon(phase.status)}
              <h2 className="text-xl font-semibold">
                Phase {phaseIndex + 1}: {phase.name}
              </h2>
              <Badge variant={
                phase.status === 'completed' ? 'success' : 
                phase.status === 'in_progress' ? 'default' : 'outline'
              }>
                {phase.status}
              </Badge>
              
              {phase.completedAt && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Completed: {new Date(phase.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              {phase.steps.map((step: any, stepIndex: number) => (
                <div key={stepIndex} className="flex items-start gap-2 p-3 border rounded bg-background">
                  <div className="mt-1">{getStatusIcon(step.status)}</div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Step {step.id}: {step.title}</h3>
                      <Badge variant={
                        step.status === 'completed' ? 'success' : 
                        step.status === 'in_progress' ? 'default' : 'outline'
                      } className="ml-2">
                        {step.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{step.action}</p>
                    
                    {step.dependencies && step.dependencies.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Dependencies:</span>
                        <div className="flex flex-wrap gap-1">
                          {step.dependencies.map((dep: string, depIndex: number) => (
                            <Badge key={depIndex} variant="outline" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {step.progress && (
                      <div className="mt-2">
                        <p className="text-xs">Progress: {step.progress}</p>
                      </div>
                    )}
                    
                    {step.result && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Result: {step.result}
                      </div>
                    )}
                    
                    {step.completedAt && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Completed: {new Date(step.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 