'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AlertCircle, 
  FileIcon, 
  RefreshCw, 
  Check, 
  FileCode2Icon,
  WandIcon,
  Loader2Icon
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface PlanGeneratorProps {
  projectId: string
}

export function PlanGenerator({ projectId }: PlanGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [generatingFiles, setGeneratingFiles] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<any | null>(null)
  const [filesToGenerate, setFilesToGenerate] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [syncingState, setSyncingState] = useState(false)

  // Load existing plan when component mounts
  useEffect(() => {
    fetchPlan()
  }, [projectId])

  // When user switches to Files tab and we have a plan, ensure files list is loaded
  useEffect(() => {
    if (activeTab === 'files' && plan && filesToGenerate.length === 0) {
      fetchFilesToGenerate()
    }
  }, [activeTab, plan])

  const generatePlan = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate project plan')
      }

      const planData = await response.json()
      setPlan(planData)
      
      // After generating a plan, fetch files that can be generated
      fetchFilesToGenerate()
      
      toast({
        title: 'Plan Generated',
        description: 'Your project plan was created successfully',
      })
    } catch (err) {
      console.error('Error generating plan:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlan = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}/plan`)

      if (!response.ok) {
        if (response.status === 404) {
          setPlan(null)
          setError(null)
          return
        }
        
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch project plan')
      }

      const planData = await response.json()
      setPlan(planData)
      
      // If plan exists, fetch files that can be generated
      fetchFilesToGenerate()
    } catch (err) {
      console.error('Error fetching plan:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const syncStateFromPlan = async () => {
    try {
      setSyncingState(true)
      const response = await fetch(`/api/projects/${projectId}/plan/sync-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Sync failed')
      toast({
        title: 'Build steps synced',
        description: data.message || 'Project state now matches the plan. Chat will use the same phases.',
      })
    } catch (err) {
      console.error('Error syncing state from plan:', err)
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Could not sync build steps from plan',
        variant: 'destructive',
      })
    } finally {
      setSyncingState(false)
    }
  }

  const fetchFilesToGenerate = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files/generation`)
      
      if (!response.ok) {
        console.warn('Failed to fetch files to generate:', response.status)
        return
      }
      
      const data = await response.json()
      setFilesToGenerate(data.files || [])
    } catch (err) {
      console.error('Error fetching files to generate:', err)
    }
  }

  const generateFiles = async () => {
    try {
      setGeneratingFiles(true)
      
      // This endpoint would typically trigger the file generation process
      const response = await fetch(`/api/projects/${projectId}/files/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.planId || plan.plan?._id
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate files')
      }
      
      const data = await response.json()
      const successCount = data.successCount ?? data.generatedFiles?.filter((f: { success?: boolean }) => f.success).length ?? 0
      const total = data.fileCount ?? data.generatedFiles?.length ?? 0
      toast({
        title: 'Files Generated',
        description: data.message || (total ? `Created ${successCount} of ${total} file(s). They appear in Repo and Generated files.` : 'Project files have been created based on the plan'),
      })
      
      fetchFilesToGenerate()
    } catch (err) {
      console.error('Error generating files:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate files',
        variant: 'destructive'
      })
    } finally {
      setGeneratingFiles(false)
    }
  }

  const hasGeneratedFiles = filesToGenerate && filesToGenerate.length > 0

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Project Planning Engine</CardTitle>
        <CardDescription>
          Generate a development plan for your project based on analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Action buttons */}
        <div className="flex space-x-4 mb-6">
          <Button 
            onClick={generatePlan} 
            disabled={loading || generatingFiles}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <WandIcon className="h-4 w-4" />
            )}
            {loading ? 'Generating...' : 'Generate Plan'}
          </Button>
          
          {/* Only show this button if there is a plan */}
          {plan && (
            <Button 
              onClick={generateFiles} 
              disabled={loading || generatingFiles}
              variant="default"
              className="flex items-center gap-2"
            >
              {generatingFiles ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <FileCode2Icon className="h-4 w-4" />
              )}
              {generatingFiles ? 'Generating Files...' : 'Generate Files'}
            </Button>
          )}
          
          {plan && (
            <Button
              onClick={syncStateFromPlan}
              variant="outline"
              disabled={loading || generatingFiles || syncingState}
              className="flex items-center gap-2"
              title="Sync build steps from this plan (for projects created before plan sync was added)"
            >
              {syncingState ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncingState ? 'Syncing…' : 'Sync build steps'}
            </Button>
          )}
          <Button 
            onClick={fetchPlan} 
            variant="outline" 
            disabled={loading || generatingFiles} 
            className="flex items-center gap-2"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        </div>

        {/* Error Display - only for real errors */}
        {error && (
          <div className="p-4 mb-4 border-l-4 border-destructive bg-destructive/10 text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <h4 className="text-sm font-medium">Error</h4>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Empty state - no plan yet (not an error) */}
        {!loading && !plan && !error && (
          <div className="p-4 mb-4 border border-border rounded-lg bg-muted/50 text-text-secondary">
            <p className="text-sm">
              No plan has been created yet. Click <strong>Generate Plan</strong> to analyze your project and create a development plan.
            </p>
          </div>
        )}

        {/* Plan Display */}
        {plan && (
          <div className="mt-4">
            <Tabs 
              defaultValue="overview" 
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-4">
                <TabsTrigger value="overview" className="flex gap-2 items-center">Overview</TabsTrigger>
                <TabsTrigger value="files" className="flex gap-2 items-center">
                  Files
                  {hasGeneratedFiles && (
                    <Badge variant="secondary" className="ml-1">{filesToGenerate.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="phases" className="flex gap-2 items-center">Phases</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                {/* Structure Info */}
                <div className="mb-4 p-4 border rounded-md">
                  <h4 className="font-medium">Structure</h4>
                  <p><strong>Name:</strong> {plan.structure.name}</p>
                  <p><strong>Description:</strong> {plan.structure.description}</p>
                  <p><strong>Root Directory:</strong> {plan.structure.fileHierarchy.path}</p>
                  <p><strong>Files/Directories:</strong> {countNodes(plan.structure.fileHierarchy)}</p>
                </div>
                
                {/* Plan Info */}
                {plan.plan && (
                  <div className="mb-4 p-4 border rounded-md">
                    <h4 className="font-medium">Development Plan</h4>
                    <p><strong>Name:</strong> {plan.plan.name}</p>
                    <p><strong>Status:</strong> {plan.plan.status}</p>
                    <p><strong>Phases:</strong> {plan.plan.phases.length}</p>
                    <p><strong>Total Tasks:</strong> {countTasks(plan.plan)}</p>
                  </div>
                )}
                
                {/* Dependencies Info */}
                {plan.dependencyTree && (
                  <div className="mb-4 p-4 border rounded-md">
                    <h4 className="font-medium">Dependencies</h4>
                    <p><strong>File Dependencies:</strong> {plan.dependencyTree.fileCount}</p>
                    <p><strong>Package Dependencies:</strong> {plan.dependencyTree.packageCount}</p>
                    {Array.isArray(plan.dependencyTree.packages) && plan.dependencyTree.packages.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">From repo / package.json:</p>
                        <div className="flex flex-wrap gap-1">
                          {plan.dependencyTree.packages.map((pkg: { name: string; version?: string; type?: string }, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{pkg.name}{pkg.version ? `@${pkg.version}` : ''}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(plan.dependencyTree.recommendedPackages) && plan.dependencyTree.recommendedPackages.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Recommended (from project ideation — install when running locally):</p>
                        <div className="flex flex-wrap gap-1">
                          {plan.dependencyTree.recommendedPackages.map((name: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* File Generation Tip - Now the only Pro Tip on the page */}
                <div className="p-4 bg-primary/10 rounded-md border-l-4 border-primary">
                  <h3 className="font-medium text-primary flex items-center">
                    <span className="text-xl mr-2">💡</span> Pro Tip
                  </h3>
                  <p className="text-sm text-primary mt-1">
                    Click the <strong>&quot;Generate Files&quot;</strong> button to automatically create all the 
                    recommended files based on this plan. This will create the file structure and starter code
                    for your project.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="files" className="space-y-4">
                <h3 className="text-lg font-medium mb-2">Files to Generate</h3>
                
                {filesToGenerate.length === 0 ? (
                  <div className="p-4 bg-muted rounded-md text-center">
                    <p className="text-muted-foreground">No files are available for generation.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You need to generate a plan first, or refresh the current plan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filesToGenerate.map((file, index) => (
                      <div key={index} className="p-3 border rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileIcon className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">
                              {file.path && (file.path.endsWith(file.name) || !file.name) ? file.path : [file.path, file.name].filter(Boolean).join('/')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {file.generationMetadata?.description || 'No description'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {file.generationMetadata?.template || 'Template'}
                        </Badge>
                      </div>
                    ))}
                    
                    <Button 
                      onClick={generateFiles} 
                      disabled={loading || generatingFiles}
                      className="w-full mt-4 flex items-center justify-center gap-2"
                    >
                      {generatingFiles ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileCode2Icon className="h-4 w-4" />
                      )}
                      {generatingFiles ? 'Generating Files...' : `Generate ${filesToGenerate.length} Files`}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="phases" className="space-y-4">
                {plan.plan?.phases ? (
                  <div className="space-y-4">
                    {plan.plan.phases.map((phase: any, index: number) => (
                      <div key={index} className="p-4 border rounded-md">
                        <h4 className="font-medium">{phase.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{phase.description}</p>
                        
                        <Progress 
                          value={calculatePhaseProgress(phase)} 
                          className="h-2 mb-3"
                        />
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          Tasks: {phase.tasks?.length || 0} | 
                          Status: {phase.status || 'Not Started'}
                        </p>
                        
                        {phase.tasks && phase.tasks.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <h5 className="text-sm font-medium">Tasks:</h5>
                            <div className="flex flex-wrap gap-1">
                              {phase.tasks.map((task: any, taskIndex: number) => (
                                <Badge 
                                  key={taskIndex}
                                  variant={getTaskVariant(task.status)}
                                  className="flex items-center gap-1 text-xs"
                                >
                                  {task.status === 'completed' && <Check className="h-3 w-3" />}
                                  {task.title ?? (task as { name?: string }).name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-muted rounded-md text-center">
                    <p className="text-muted-foreground">No phases are defined in the plan.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to count nodes in file hierarchy
function countNodes(node: any): number {
  if (!node) return 0
  
  let count = 1 // Count this node
  
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNodes(child)
    }
  }
  
  return count
}

// Helper function to count tasks in plan
function countTasks(plan: any): number {
  if (!plan || !plan.phases) return 0
  
  return plan.phases.reduce((total: number, phase: any) => {
    if (phase.tasks && Array.isArray(phase.tasks)) {
      return total + phase.tasks.length
    }
    return total
  }, 0)
}

// Calculate phase progress percentage
function calculatePhaseProgress(phase: any): number {
  if (!phase.tasks || phase.tasks.length === 0) return 0
  
  const completedTasks = phase.tasks.filter((task: any) => 
    task.status === 'completed'
  ).length
  
  return (completedTasks / phase.tasks.length) * 100
}

// Get badge variant based on task status
function getTaskVariant(status: string): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'
    case 'in_progress':
      return 'secondary'
    default:
      return 'outline'
  }
} 