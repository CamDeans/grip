'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Terminal } from '@/components/terminal/Terminal'
import { Button } from '@/components/ui'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Terminal as TerminalIcon, Plus, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const DEFAULT_PROJECT_ID = '000000000000000000000000'

/**
 * Terminal Manager Component - Part of Phase 6, Step 1 of G.R.I.P. Enhancement Plan
 * Manages multiple terminal instances via API only (no server-only imports on client).
 * When projectId is in the URL (?projectId=xxx), terminals run real npm/yarn/pnpm
 * in that project's folder (project must have been set up with a local path).
 */
export function Manager() {
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams?.get('projectId') || undefined
  const projectId = projectIdFromUrl && projectIdFromUrl.length === 24 ? projectIdFromUrl : DEFAULT_PROJECT_ID
  const isProjectScoped = projectId !== DEFAULT_PROJECT_ID

  const [terminals, setTerminals] = useState<string[]>([])
  const [activeTerminal, setActiveTerminal] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [hasProjectPath, setHasProjectPath] = useState(false)
  const [isVercel, setIsVercel] = useState(false)

  // Load terminal sessions from the API (scoped to project when projectId in URL)
  const loadTerminals = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/terminal/session?projectId=${projectId}`)
      if (!res.ok) throw new Error('Failed to load sessions')
      const data = await res.json()
      const sessions = data.sessions || []

      if (sessions.length > 0) {
        const terminalIds = sessions.map((s: { id: string }) => s.id)
        setTerminals(terminalIds)

        const savedTerminal = localStorage.getItem('grip_active_terminal')
        const terminalToActivate =
          savedTerminal && terminalIds.includes(savedTerminal)
            ? savedTerminal
            : terminalIds[0] || null

        setActiveTerminal(terminalToActivate)
        if (terminalToActivate) {
          localStorage.setItem('grip_active_terminal', terminalToActivate)
        }
      } else {
        createTerminal()
      }
    } catch (error) {
      console.error('Error loading terminals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Create a new terminal session via API
  const createTerminal = async () => {
    try {
      const res = await fetch('/api/terminal/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          metadata: {
            createdBy: 'system',
            purpose: projectId !== DEFAULT_PROJECT_ID ? 'Project terminal (real npm/commands)' : 'User terminal session'
          }
        })
      })
      if (!res.ok) throw new Error('Failed to create session')
      const data = await res.json()
      const newId = data.sessionId || data.session?.id
      if (!newId) throw new Error('No session id in response')

      setTerminals(prev => [...prev, newId])
      setActiveTerminal(newId)
      localStorage.setItem('grip_active_terminal', newId)
    } catch (error) {
      console.error('Error creating terminal:', error)
    }
  }

  // Delete a terminal
  const deleteTerminal = async (id: string) => {
    try {
      const response = await fetch(`/api/terminal?terminalId=${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete terminal')
      
      // Remove from terminals list
      setTerminals(prev => prev.filter(t => t !== id))
      
      // If this was the active terminal, select another one
      if (activeTerminal === id) {
        const nextTerminal = terminals.filter(t => t !== id)[0] || null
        setActiveTerminal(nextTerminal)
        
        if (nextTerminal) {
          localStorage.setItem('grip_active_terminal', nextTerminal)
        } else {
          localStorage.removeItem('grip_active_terminal')
        }
      }
    } catch (error) {
      console.error('Error deleting terminal:', error)
    }
  }

  // Handle terminal selection
  const selectTerminal = (id: string) => {
    setActiveTerminal(id)
    localStorage.setItem('grip_active_terminal', id)
  }

  // Load terminals on mount and when projectId (from URL) changes
  useEffect(() => {
    loadTerminals()
  }, [projectId])

  // When terminal is project-scoped, fetch project title and whether it has a folder path
  useEffect(() => {
    if (!isProjectScoped) {
      setProjectTitle(null)
      setHasProjectPath(false)
      return
    }
    let cancelled = false
    fetch(`/api/projects/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setProjectTitle(data.title ?? null)
        setHasProjectPath(Boolean(data.projectPath))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [projectId, isProjectScoped])

  return (
    <div className="h-full flex flex-col">
      <Card className="mb-4 border-border">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TerminalIcon className="h-5 w-5 mr-2 text-primary" />
              <CardTitle>Terminal Manager</CardTitle>
              <Badge 
                variant="outline" 
                className="ml-2 bg-primary/10 text-primary border-primary/20 text-xs"
              >
                {terminals.length} sessions
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadTerminals}
                className="h-8"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                size="sm" 
                onClick={createTerminal} 
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Terminal
              </Button>
            </div>
          </div>
          <CardDescription>
            {projectId !== DEFAULT_PROJECT_ID
              ? 'Terminal for this project — npm install and npm run dev run in the project folder.'
              : 'Manage and interact with terminal sessions. Add ?projectId=xxx to the URL to run commands in a project folder.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            {terminals.length === 0 ? (
              <div className="flex items-center justify-center w-full p-6 border border-dashed border-border rounded-lg text-sm text-text-muted">
                <div className="text-center">
                  <TerminalIcon className="h-8 w-8 mx-auto mb-2 text-text-muted" />
                  <p>No terminals available.</p>
                  <p className="mt-1">Create a new terminal to get started.</p>
                </div>
              </div>
            ) : (
              terminals.map(id => (
                <Button
                  key={id}
                  variant={activeTerminal === id ? 'default' : 'outline'}
                  onClick={() => selectTerminal(id)}
                  className={`flex-grow-0 ${activeTerminal === id 
                    ? '' 
                    : 'border-border hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center">
                    <TerminalIcon className="h-4 w-4 mr-1" />
                    <span>Terminal {id.slice(0, 8)}</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 text-xs ${
                        activeTerminal === id 
                          ? 'bg-primary/20 text-primary-foreground border-primary' 
                          : ''
                      }`}
                    >
                      {activeTerminal === id ? 'Active' : 'Idle'}
                    </Badge>
                  </div>
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {activeTerminal ? (
        <div className="flex-1">
          <Terminal
            id={activeTerminal}
            onDelete={deleteTerminal}
            projectTitle={projectTitle ?? undefined}
            hasProjectPath={hasProjectPath}
            isVercel={isVercel}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background-tertiary rounded-lg border border-dashed border-border">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="border-b border-border">
              <div className="flex items-center">
                <TerminalIcon className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>No Active Terminal</CardTitle>
              </div>
              <CardDescription>
                Create a new terminal to begin working with commands
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button 
                onClick={createTerminal} 
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Terminal
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 