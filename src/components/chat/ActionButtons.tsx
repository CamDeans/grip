'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useParams } from 'next/navigation'
import { TrackingButton } from '@/components/ui/TrackingButton'
import { 
  CodeIcon, 
  SearchIcon, 
  PlayIcon, 
  PackageIcon, 
  GitBranchIcon, 
  WrenchIcon,
  AlertCircleIcon 
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Phase 8, Step 4: Action Buttons for common development actions
interface ActionButtonsProps {
  projectId: string
  onActionTriggered?: (action: string, message: string) => void
  className?: string
}

type ActionDefinition = {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  trackingContext: string
}

export function ActionButtons({ projectId, onActionTriggered, className }: ActionButtonsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Define available actions
  const actions: ActionDefinition[] = [
    {
      id: 'generate-code',
      label: 'Generate Code',
      icon: <CodeIcon className="h-4 w-4 mr-2" />,
      description: 'Generate code based on specifications',
      trackingContext: 'code_generation'
    },
    {
      id: 'analyze-code',
      label: 'Analyze Code',
      icon: <SearchIcon className="h-4 w-4 mr-2" />,
      description: 'Analyze and review code quality',
      trackingContext: 'code_analysis'
    },
    {
      id: 'run-build',
      label: 'Run Build',
      icon: <PlayIcon className="h-4 w-4 mr-2" />,
      description: 'Build the project',
      trackingContext: 'build_execution'
    },
    {
      id: 'create-component',
      label: 'Create Component',
      icon: <PackageIcon className="h-4 w-4 mr-2" />,
      description: 'Create a new component',
      trackingContext: 'component_creation'
    },
    {
      id: 'install-package',
      label: 'Install Package',
      icon: <PackageIcon className="h-4 w-4 mr-2" />,
      description: 'Install a new package or dependency',
      trackingContext: 'package_installation'
    },
    {
      id: 'fix-issues',
      label: 'Fix Issues',
      icon: <AlertCircleIcon className="h-4 w-4 mr-2" />,
      description: 'Fix issues and bugs',
      trackingContext: 'issue_fixing'
    },
    {
      id: 'git-operations',
      label: 'Git Operations',
      icon: <GitBranchIcon className="h-4 w-4 mr-2" />,
      description: 'Perform git operations',
      trackingContext: 'git_operations'
    }
  ]
  
  const handleAction = async (action: ActionDefinition) => {
    if (isLoading) return
    
    setIsLoading(action.id)
    
    try {
      // Call the API to trigger the action
      const response = await fetch('/api/projects/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          action: action.id
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to execute action')
      }
      
      const result = await response.json()
      
      // Show success notification
      toast({
        title: 'Action triggered',
        description: result.message || 'Action has been triggered successfully',
        variant: 'default'
      })
      
      // Notify parent component
      if (onActionTriggered) {
        onActionTriggered(action.id, result.message)
      }
    } catch (error) {
      console.error('Error triggering action:', error)
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Failed to execute action',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(null)
    }
  }
  
  return (
    <div className={`flex flex-wrap gap-2 mt-4 ${className || ''}`}>
      {actions.map((action) => (
        <TrackingButton
          key={action.id}
          variant="outline"
          size="sm"
          disabled={!!isLoading}
          onClick={() => handleAction(action)}
          trackingPhase="development"
          trackingStep={1}
          trackingContext={action.trackingContext}
          title={action.description}
          className="font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20"
        >
          {action.icon}
          {action.label}
          {isLoading === action.id && (
            <span className="ml-2 animate-pulse">...</span>
          )}
        </TrackingButton>
      ))}
    </div>
  )
} 