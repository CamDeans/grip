'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import {
  AlertCircle,
  Save,
  Trash,
  Archive,
  RefreshCw,
  Settings,
  Terminal,
  ListTodo
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { LoadingState } from '@/components/ui/LoadingState'

interface Project {
  _id: string
  title: string
  description: string
  status?: 'active' | 'completed' | 'archived'
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
  createdAt: string
  updatedAt: string
}

export default function ProjectSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state (repo is set at project creation; GitHub token is in Dashboard → Settings)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goals: '',
    targetAudience: '',
    keyFeatures: '',
    technicalRequirements: ''
  })
  
  // Settings state
  const [settings, setSettings] = useState({
    enableAnalysis: true,
    enableBuildAutomation: true,
    enableTaskTracking: true,
    disableWebSocket: false,
    enableLogging: true
  })
  
  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.status}`)
        }
        
        const data = await response.json()
        setProject(data)
        
        // Initialize form data
        setFormData({
          title: data.title || '',
          description: data.description || '',
          goals: data.ideation?.goals || '',
          targetAudience: data.ideation?.targetAudience || '',
          keyFeatures: data.ideation?.keyFeatures || '',
          technicalRequirements: data.ideation?.technicalRequirements || ''
        })
      } catch (err) {
        console.error('Error fetching project:', err)
        setError(err instanceof Error ? err.message : 'Failed to load project')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProject()
  }, [projectId])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings(prev => ({ ...prev, [name]: checked }))
  }
  
  // Handle form submission (save project details via API)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          ideation: {
            goals: formData.goals,
            targetAudience: formData.targetAudience,
            keyFeatures: formData.keyFeatures,
            technicalRequirements: formData.technicalRequirements,
          },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || `Failed to save (${response.status})`)
      }
      setProject(data)
      toast({
        title: 'Settings saved',
        description: 'Your project settings have been updated successfully.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const currentStatus = (project?.status || 'active') as 'active' | 'completed' | 'archived'

  const handleSetStatus = async (status: 'active' | 'completed' | 'archived') => {
    if (!projectId || status === currentStatus) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `Failed to set status (${response.status})`)
      setProject((prev) => (prev ? { ...prev, status } : null))
      toast({
        title: status === 'archived' ? 'Project archived' : status === 'completed' ? 'Marked as completed' : 'Set to active',
        description: status === 'archived' ? 'This project is now read-only.' : status === 'completed' ? 'It will appear under Completed on the projects list.' : 'It will appear under Active again.',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // Archive project (set status to archived)
  const handleArchive = async () => {
    if (!projectId) return
    if (!confirm('Archive this project? It will become read-only.')) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `Failed to archive (${response.status})`)
      setProject((prev) => (prev ? { ...prev, status: 'archived' } : null))
      toast({ title: 'Project archived', description: 'This project is now read-only.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete project permanently
  const handleDelete = async () => {
    if (!projectId) return
    if (!confirm('Permanently delete this project and all its data? This cannot be undone.')) return
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `Failed to delete (${response.status})`)
      toast({ title: 'Project deleted', description: 'The project has been permanently removed.' })
      router.push('/dashboard/projects')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return <LoadingState message="Loading project settings..." />
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center p-6">
        <Card className="p-6 max-w-md w-full bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error Loading Project</h3>
          </div>
          <p className="text-destructive/90 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/projects')}
          >
            Back to Projects
          </Button>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Project Settings</h1>
        <p className="text-muted-foreground">
          Configure your project settings and preferences for {project?.title}
        </p>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="flex gap-2 items-center">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex gap-2 items-center">
            <Terminal className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSubmit}>
          <TabsContent value="general" className="space-y-6 mt-2">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">General Information</h2>
              
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Project Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter project title"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter project description"
                    rows={3}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="goals">Project Goals</Label>
                  <Textarea
                    id="goals"
                    name="goals"
                    value={formData.goals}
                    onChange={handleInputChange}
                    placeholder="What are the main goals of this project?"
                    rows={3}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="keyFeatures">Key Features</Label>
                  <Textarea
                    id="keyFeatures"
                    name="keyFeatures"
                    value={formData.keyFeatures}
                    onChange={handleInputChange}
                    placeholder="List the key features of your project"
                    rows={3}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="technicalRequirements">Technical Requirements</Label>
                  <Textarea
                    id="technicalRequirements"
                    name="technicalRequirements"
                    value={formData.technicalRequirements}
                    onChange={handleInputChange}
                    placeholder="Technical requirements and specifications"
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-2">Project status</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Controls how this project appears on the projects list (Active / Completed / Archived). You can change this anytime.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={currentStatus === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSetStatus('active')}
                  disabled={isSaving || currentStatus === 'active'}
                >
                  Active
                </Button>
                <Button
                  type="button"
                  variant={currentStatus === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSetStatus('completed')}
                  disabled={isSaving || currentStatus === 'completed'}
                >
                  Completed
                </Button>
                <Button
                  type="button"
                  variant={currentStatus === 'archived' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSetStatus('archived')}
                  disabled={isSaving || currentStatus === 'archived'}
                >
                  Archived
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Active = in progress. Completed = done (still editable). Archived = read-only; use &quot;Active&quot; to unarchive.
              </p>
            </Card>
            
            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-6 mt-2">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">Advanced Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="enableAnalysis" className="text-base font-medium">Repository Analysis</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable automatic code analysis for this project
                    </p>
                  </div>
                  <Switch
                    id="enableAnalysis"
                    checked={settings.enableAnalysis}
                    onCheckedChange={(checked) => handleSwitchChange('enableAnalysis', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="enableBuildAutomation" className="text-base font-medium">Build Automation</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable automated build processes
                    </p>
                  </div>
                  <Switch
                    id="enableBuildAutomation"
                    checked={settings.enableBuildAutomation}
                    onCheckedChange={(checked) => handleSwitchChange('enableBuildAutomation', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="enableTaskTracking" className="text-base font-medium">Task Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable task tracking and progress monitoring
                    </p>
                  </div>
                  <Switch
                    id="enableTaskTracking"
                    checked={settings.enableTaskTracking}
                    onCheckedChange={(checked) => handleSwitchChange('enableTaskTracking', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="enableLogging" className="text-base font-medium">Enhanced Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable detailed logging for debugging
                    </p>
                  </div>
                  <Switch
                    id="enableLogging"
                    checked={settings.enableLogging}
                    onCheckedChange={(checked) => handleSwitchChange('enableLogging', checked)}
                  />
                </div>
              </div>
            </Card>
            
            <Card className="p-4 border-destructive/20 bg-destructive/5">
              <h2 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Archive Project</p>
                    <p className="text-sm text-muted-foreground">
                      Archive this project to make it read-only
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={handleArchive}
                    disabled={isSaving || project?.status === 'archived'}
                  >
                    <Archive className="h-4 w-4" />
                    {project?.status === 'archived' ? 'Archived' : 'Archive'}
                  </Button>
                </div>
                
                <div className="border-t border-destructive/20 pt-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-destructive">Delete Project</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this project and all its data
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    className="gap-2"
                    onClick={handleDelete}
                    disabled={isSaving}
                  >
                    <Trash className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
            
            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  )
} 