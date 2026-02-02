'use client'

/**
 * Terminal Command Suggestions Component
 * Part of Phase 6, Step 5 of G.R.I.P. Enhancement Plan - Add Command Suggestions
 * 
 * This component provides intelligent command suggestions based on:
 * - Command history
 * - Project context
 * - Current terminal state
 * - Common commands and patterns
 */

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Command, PanelRight, Book, Terminal, GitBranch, Package } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card } from '@/components/ui/card'

// Command category types
type CommandCategory = 
  | 'history' 
  | 'project' 
  | 'system' 
  | 'git' 
  | 'npm' 
  | 'custom'

// Enhanced suggestion interface with metadata
interface CommandSuggestion {
  command: string
  description: string
  category: CommandCategory
  relevance: number // 0-100 score for sorting
  args?: string[] // Optional arguments
  example?: string // Example usage
}

// Props for the component
interface CommandSuggestionsProps {
  input: string
  projectId?: string
  currentDirectory?: string
  commandHistory: string[]
  onSelectSuggestion: (suggestion: string) => void
  className?: string
}

export function CommandSuggestions({
  input,
  projectId,
  currentDirectory,
  commandHistory,
  onSelectSuggestion,
  className
}: CommandSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([])
  const [contextEnabled, setContextEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // Common system commands with descriptions
  const SYSTEM_COMMANDS: CommandSuggestion[] = [
    { command: 'ls', description: 'List directory contents', category: 'system', relevance: 90 },
    { command: 'cd', description: 'Change directory', category: 'system', relevance: 90, args: ['directory'] },
    { command: 'mkdir', description: 'Create a new directory', category: 'system', relevance: 80, args: ['name'] },
    { command: 'touch', description: 'Create a new file', category: 'system', relevance: 80, args: ['filename'] },
    { command: 'rm', description: 'Remove files or directories', category: 'system', relevance: 75, args: ['target'] },
    { command: 'cp', description: 'Copy files or directories', category: 'system', relevance: 75, args: ['source', 'destination'] },
    { command: 'mv', description: 'Move/rename files or directories', category: 'system', relevance: 75, args: ['source', 'destination'] },
    { command: 'cat', description: 'Display file contents', category: 'system', relevance: 70, args: ['filename'] },
    { command: 'grep', description: 'Search file contents', category: 'system', relevance: 70, args: ['pattern', 'file'] },
    { command: 'find', description: 'Find files by name', category: 'system', relevance: 70, args: ['path', 'expression'] },
    { command: 'pwd', description: 'Print working directory', category: 'system', relevance: 85 },
    { command: 'echo', description: 'Display a message', category: 'system', relevance: 60, args: ['text'] },
    { command: 'clear', description: 'Clear terminal screen', category: 'system', relevance: 60 },
    { command: 'help', description: 'Display help information', category: 'system', relevance: 95 },
  ]
  
  // Git commands
  const GIT_COMMANDS: CommandSuggestion[] = [
    { command: 'git init', description: 'Initialize a git repository', category: 'git', relevance: 80 },
    { command: 'git clone', description: 'Clone a repository', category: 'git', relevance: 85, args: ['url'] },
    { command: 'git add', description: 'Add files to staging', category: 'git', relevance: 90, args: ['files'] },
    { command: 'git commit', description: 'Commit changes', category: 'git', relevance: 90, args: ['-m "message"'] },
    { command: 'git push', description: 'Push commits to remote', category: 'git', relevance: 85 },
    { command: 'git pull', description: 'Pull changes from remote', category: 'git', relevance: 85 },
    { command: 'git status', description: 'Show working tree status', category: 'git', relevance: 95 },
    { command: 'git branch', description: 'List or create branches', category: 'git', relevance: 80 },
    { command: 'git checkout', description: 'Switch branches', category: 'git', relevance: 85, args: ['branch'] },
    { command: 'git merge', description: 'Merge branches', category: 'git', relevance: 75, args: ['branch'] },
    { command: 'git log', description: 'Show commit logs', category: 'git', relevance: 70 },
  ]
  
  // NPM commands
  const NPM_COMMANDS: CommandSuggestion[] = [
    { command: 'npm init', description: 'Initialize a package.json', category: 'npm', relevance: 80 },
    { command: 'npm install', description: 'Install packages', category: 'npm', relevance: 95, args: ['package'] },
    { command: 'npm start', description: 'Start the application', category: 'npm', relevance: 90 },
    { command: 'npm run', description: 'Run script from package.json', category: 'npm', relevance: 90, args: ['script'] },
    { command: 'npm test', description: 'Run tests', category: 'npm', relevance: 85 },
    { command: 'npm build', description: 'Build the application', category: 'npm', relevance: 85 },
    { command: 'npm update', description: 'Update packages', category: 'npm', relevance: 75 },
    { command: 'npm uninstall', description: 'Remove a package', category: 'npm', relevance: 75, args: ['package'] },
  ]

  // Get context-aware suggestions based on project type and directory
  const getContextSuggestions = useCallback(async () => {
    if (!projectId || !contextEnabled) return []
    
    setIsLoading(true)
    try {
      // Fetch project-specific suggestions from the API
      const response = await fetch(`/api/terminal/suggestions?projectId=${projectId}&directory=${encodeURIComponent(currentDirectory || '/')}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
      }
      
      const data = await response.json()
      return data.suggestions.map((s: any) => ({
        ...s,
        category: 'project'
      }))
    } catch (error) {
      console.error('Error fetching context suggestions:', error)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [projectId, currentDirectory, contextEnabled])
  
  // Get history-based suggestions
  const getHistorySuggestions = useCallback(() => {
    // Get unique commands from history
    const uniqueCommands = Array.from(new Set(commandHistory))
    
    // Convert to suggestion objects
    return uniqueCommands.map(cmd => ({
      command: cmd,
      description: 'Previously used command',
      category: 'history' as CommandCategory,
      relevance: 80
    }))
  }, [commandHistory])
  
  // Generate intelligent suggestions based on input
  const generateSuggestions = useCallback(async (input: string) => {
    if (!input.trim()) {
      return []
    }
    
    const inputLower = input.toLowerCase().trim()
    const inputParts = inputLower.split(' ')
    const baseCommand = inputParts[0]
    
    // Collect all potential suggestions
    let allSuggestions: CommandSuggestion[] = [
      ...SYSTEM_COMMANDS,
      ...GIT_COMMANDS,
      ...NPM_COMMANDS,
      ...getHistorySuggestions()
    ]
    
    // Add context-aware suggestions if available
    const contextSuggestions = await getContextSuggestions()
    allSuggestions = [...allSuggestions, ...contextSuggestions]
    
    // Filter suggestions based on input
    const matchingSuggestions = allSuggestions.filter(suggestion => {
      const cmdParts = suggestion.command.toLowerCase().split(' ')
      
      // Exact match for first part of command
      if (inputParts.length === 1) {
        return cmdParts[0].startsWith(baseCommand)
      }
      
      // Multi-part command matching
      if (cmdParts.length > 1 && cmdParts[0] === baseCommand) {
        const restOfInput = inputParts.slice(1).join(' ')
        const restOfCommand = cmdParts.slice(1).join(' ')
        return restOfCommand.startsWith(restOfInput)
      }
      
      return false
    })
    
    // Sort by relevance and limit results
    return matchingSuggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
  }, [getHistorySuggestions, getContextSuggestions])
  
  // Update suggestions when input changes
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([])
      return
    }
    
    const updateSuggestions = async () => {
      const newSuggestions = await generateSuggestions(input)
      setSuggestions(newSuggestions)
    }
    
    updateSuggestions()
  }, [input, generateSuggestions])
  
  // Get icon for category
  const getCategoryIcon = (category: CommandCategory) => {
    switch (category) {
      case 'history':
        return <Book className="h-3 w-3" />
      case 'project':
        return <PanelRight className="h-3 w-3" />
      case 'system':
        return <Terminal className="h-3 w-3" />
      case 'git':
        return <GitBranch className="h-3 w-3" />
      case 'npm':
        return <Package className="h-3 w-3" />
      default:
        return <Command className="h-3 w-3" />
    }
  }
  
  // Get color for category
  const getCategoryColor = (category: CommandCategory) => {
    switch (category) {
      case 'history':
        return 'bg-primary'
      case 'project':
        return 'bg-success'
      case 'system':
        return 'bg-text-muted'
      case 'git':
        return 'bg-accent-amber'
      case 'npm':
        return 'bg-destructive'
      default:
        return 'bg-accent-blue'
    }
  }
  
  if (suggestions.length === 0) {
    return null
  }
  
  return (
    <Card className={`border border-border rounded overflow-hidden ${className}`}>
      <div className="bg-background-tertiary divide-y divide-border">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="px-3 py-1.5 hover:bg-background-secondary cursor-pointer"
            onClick={() => onSelectSuggestion(suggestion.command)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="font-mono text-primary">{suggestion.command}</div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={`h-4 px-1 flex items-center text-[10px] text-white ${getCategoryColor(suggestion.category)}`}
                      >
                        {getCategoryIcon(suggestion.category)}
                        <span className="ml-1">{suggestion.category}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{suggestion.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <span className="text-xs text-text-muted truncate max-w-xs">
                {suggestion.description}
              </span>
            </div>
            
            {suggestion.example && (
              <div className="text-xs text-text-muted mt-1">
                Example: <code className="text-text-muted">{suggestion.example}</code>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
} 