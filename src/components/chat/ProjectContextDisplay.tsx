'use client'

import { useState, useEffect, useMemo } from 'react'
import { useEnhancedChat } from '@/hooks/useEnhancedChat'
import { 
  CheckCircleIcon, 
  CircleIcon, 
  AlertCircleIcon, 
  ChevronDownIcon,
  ChevronUpIcon,
  CodeIcon,
  GitBranchIcon,
  StarIcon,
  ListTodoIcon,
  ClockIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// Extracted from EnhancedChatInterface.tsx for better testability
// Phase 8, Step 1: Project Context Display component
// Enhanced for production readiness

/**
 * Component for displaying project context in the chat interface
 * Shows the current project phase and steps with status indicators
 */
export function ProjectContextDisplay() {
  const { projectContext, contextEnabled, analysisContext, refreshContext, loadingContext } = useEnhancedChat();
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [currentSteps, setCurrentSteps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [projectStats, setProjectStats] = useState<{
    totalFiles?: number;
    languages?: Record<string, number>;
    componentsCount?: number;
    lastUpdated?: string;
  }>({});
  
  // Extract project statistics from analysis context
  useEffect(() => {
    if (analysisContext) {
      setProjectStats({
        totalFiles: analysisContext.repositoryStructure?.totalFiles || 0,
        languages: analysisContext.repositoryStructure?.languages || {},
        componentsCount: analysisContext.codeStructure?.components?.length || 0,
        lastUpdated: new Date().toLocaleDateString()
      });
    }
  }, [analysisContext]);
  
  // Get primary language from project stats
  const primaryLanguage = useMemo(() => {
    if (!projectStats.languages) return null;
    
    // Find language with highest percentage
    const entries = Object.entries(projectStats.languages);
    if (entries.length === 0) return null;
    
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [projectStats.languages]);
  
  // Create fetchProjectState function outside of useEffect for reuse
  const fetchProjectState = async (retryCount = 0) => {
    if (!projectContext?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectContext.id}/state`);
      if (response.ok) {
        const data = await response.json();
        
        // Find the current active phase
        const activePhase = data.phases.find(
          (phase: any) => phase.status === 'in_progress'
        ) || data.phases[0];
        
        if (activePhase) {
          setCurrentPhase(activePhase.name);
          // Get all steps but only show a limited number in collapsed view
          setCurrentSteps(activePhase.steps || []);
        } else {
          setCurrentPhase("Setup");
          setCurrentSteps([]);
        }
      } else {
        console.error('Failed to load project state:', response.status, response.statusText);
        
        // Retry on server errors
        if (response.status >= 500 && retryCount < 2) {
          setTimeout(() => fetchProjectState(retryCount + 1), 1000 * Math.pow(2, retryCount));
          return;
        }
        
        if (response.status === 404) {
          setError('Project state not found');
        } else {
          setError(`Failed to load project state (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch project state:', error);
      
      // Retry on network errors
      if (retryCount < 2) {
        setTimeout(() => fetchProjectState(retryCount + 1), 1000 * Math.pow(2, retryCount));
        return;
      }
      
      setError('Error loading project context');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (contextEnabled && projectContext?.id) {
      fetchProjectState();
    }
  }, [projectContext, contextEnabled]);
  
  // Manual refresh function
  const handleRefresh = () => {
    if (projectContext?.id) {
      refreshContext();
      setError(null);
      setIsLoading(true);
      
      // Fetch project state after a short delay to allow context to refresh
      setTimeout(() => {
        fetchProjectState();
      }, 500);
    }
  };
  
  // If context is disabled or no project is selected, don't show anything
  if (!contextEnabled || !projectContext?.id) return null;
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed':
        return <CheckCircleIcon className="h-3 w-3 text-success" />;
      case 'in_progress':
        return <CircleIcon className="h-3 w-3 text-primary animate-pulse" />;
      case 'failed':
        return <AlertCircleIcon className="h-3 w-3 text-destructive" />;
      default:
        return <CircleIcon className="h-3 w-3 text-text-muted" />;
    }
  };
  
  // Display a loading state
  if (isLoading || loadingContext) {
    return (
      <div className="border-t border-border p-2 bg-background-secondary/50">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }
  
  // Display error state with retry button
  if (error) {
    return (
      <div className="border-t border-border p-2 bg-background-secondary/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-destructive text-xs">
            <AlertCircleIcon className="h-3 w-3 mr-1" />
            <p>{error}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            className="h-6 text-xs"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  // Determine how many steps to show in collapsed view
  const stepsToShow = isExpanded ? currentSteps : currentSteps.slice(0, 3);
  const hasMoreSteps = currentSteps.length > 3;
  
  return (
    <div className="border-t border-border py-1 px-2 bg-background-secondary/50 transition-all" data-testid="project-context-display">
      {/* Project header with expand/collapse control */}
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <h3 className="text-xs font-medium text-foreground flex items-center truncate max-w-[150px]">
            {projectContext.title} 
            {primaryLanguage && (
              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 hidden sm:inline-flex">
                {primaryLanguage}
              </Badge>
            )}
          </h3>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-4 w-4 p-0 ml-1"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse project context" : "Expand project context"}
          >
            {isExpanded ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
          </Button>
        </div>
        
        {currentPhase && !isExpanded && (
          <div className="text-xs text-primary font-medium truncate max-w-[100px]">{currentPhase}</div>
        )}
      </div>
      
      {/* Steps display in compact form if not expanded */}
      {!isExpanded && stepsToShow.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {stepsToShow.map((step, index) => (
            <Badge 
              key={step.id || index}
              variant={step.status === 'in_progress' ? 'default' : step.status === 'completed' ? 'outline' : 'secondary'}
              className="flex items-center gap-1 text-[10px] py-0 px-1"
            >
              {getStatusIcon(step.status)}
              <span className="truncate max-w-[80px]">{step.title}</span>
            </Badge>
          ))}
          {hasMoreSteps && !isExpanded && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1">
              +{currentSteps.length - 3} more
            </Badge>
          )}
        </div>
      )}
      
      {/* Expanded view content - keep it ultra compact */}
      {isExpanded && (
        <div className="mt-1 text-[10px]">
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex items-center">
              <CodeIcon className="h-3 w-3 mr-1" />
              {projectStats.totalFiles || 0} files
            </div>
            
            <div className="flex items-center ml-2">
              <StarIcon className="h-3 w-3 mr-1" />
              {projectStats.componentsCount || 0} components
            </div>
            
            {currentPhase && (
              <div className="ml-2">
                <span className="text-text-secondary">Phase:</span>{" "}
                <span className="font-medium text-primary">{currentPhase}</span>
              </div>
            )}
          </div>
          
          {stepsToShow.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {stepsToShow.map((step, index) => (
                <Badge 
                  key={step.id || index}
                  variant={step.status === 'in_progress' ? 'default' : step.status === 'completed' ? 'outline' : 'secondary'}
                  className="flex items-center gap-1 text-[10px] py-0 px-1"
                >
                  {getStatusIcon(step.status)}
                  <span className="truncate max-w-[80px]">{step.title}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 