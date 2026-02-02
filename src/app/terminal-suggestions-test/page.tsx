'use client'

/**
 * Terminal Command Suggestions Test Page
 * Part of Phase 6, Step 5 of G.R.I.P. Enhancement Plan - Add Command Suggestions
 * 
 * This test page demonstrates the functionality of intelligent command suggestions
 * based on project context, directory, and command history.
 */

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Terminal as TerminalIcon, Code, Database, Braces } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CommandSuggestions } from '@/components/terminal/CommandSuggestions'

export default function TerminalSuggestionsTest() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [projectId] = useState('test-project')
  const [directory, setDirectory] = useState('/home/user/project')
  const [activeTab, setActiveTab] = useState<'react' | 'node' | 'mongo'>('react')
  
  // Project tech contexts based on selected tab
  const projectTechContexts = {
    react: ['react', 'next.js', 'typescript', 'tailwindcss'],
    node: ['node.js', 'express', 'typescript', 'mongodb'],
    mongo: ['mongodb', 'mongoose', 'node.js']
  }
  
  // Directory contexts based on selected tab
  const directoryContexts = {
    react: '/home/user/project/nextjs-app',
    node: '/home/user/project/api-server',
    mongo: '/home/user/project/database'
  }
  
  // Update directory when tab changes
  useEffect(() => {
    setDirectory(directoryContexts[activeTab])
  }, [activeTab])
  
  // Handle suggestion selection
  const handleSelectSuggestion = (command: string) => {
    setInput(command)
    // Focus the input element
    const inputElement = document.getElementById('command-input') as HTMLInputElement
    if (inputElement) {
      inputElement.focus()
    }
  }
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    // Add to history
    setHistory(prev => [input, ...prev])
    setInput('')
  }
  
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Terminal Command Suggestions Test</h1>
      <p className="mb-4">
        This page tests the Phase 6, Step 5 implementation of intelligent terminal command suggestions.
        Type in the input field below to see context-aware suggestions based on the selected technology stack.
      </p>
      
      <div className="flex space-x-4 mb-6">
        <Button 
          variant={activeTab === 'react' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('react')}
        >
          <Braces className="h-4 w-4 mr-2" />
          React/Next.js Project
        </Button>
        <Button 
          variant={activeTab === 'node' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('node')}
        >
          <Code className="h-4 w-4 mr-2" />
          Node.js API Project
        </Button>
        <Button 
          variant={activeTab === 'mongo' ? 'default' : 'outline'} 
          onClick={() => setActiveTab('mongo')}
        >
          <Database className="h-4 w-4 mr-2" />
          MongoDB Project
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
            <div className="flex items-center">
              <TerminalIcon className="h-5 w-5 mr-2 text-primary" />
              <CardTitle className="text-md">Command Suggestions</CardTitle>
              <Badge variant="outline" className="ml-2 text-xs">
                {directory}
              </Badge>
            </div>
            <Badge>
              {projectTechContexts[activeTab].join(', ')}
            </Badge>
          </CardHeader>
          
          <CardContent className="pt-4 pb-0">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                <div className="text-sm">
                  <p>Type a command below to see intelligent suggestions based on:</p>
                  <ul className="list-disc pl-5 mt-2 text-text-secondary">
                    <li>Current directory context: <code className="text-xs bg-background-tertiary p-1 rounded">{directory}</code></li>
                    <li>Project technology: <code className="text-xs bg-background-tertiary p-1 rounded">{projectTechContexts[activeTab].join(', ')}</code></li>
                    <li>Command history (try typing a command and pressing Enter to add it to history)</li>
                  </ul>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <h3 className="font-semibold mb-2">Command History:</h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-text-muted">No commands in history yet</p>
                  ) : (
                    <div className="space-y-1">
                      {history.map((cmd, index) => (
                        <div 
                          key={index} 
                          className="text-sm font-mono bg-background-tertiary p-1 rounded cursor-pointer hover:bg-background-secondary"
                          onClick={() => setInput(cmd)}
                        >
                          $ {cmd}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="border-t p-3 relative">
            <form onSubmit={handleSubmit} className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-success">$</span>
                </div>
                <Input
                  id="command-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a command..."
                  className="pl-7 font-mono"
                />
                
                {/* Command suggestions component */}
                <div className="relative">
                  <CommandSuggestions
                    input={input}
                    projectId={projectId}
                    currentDirectory={directory}
                    commandHistory={history}
                    onSelectSuggestion={handleSelectSuggestion}
                    className="absolute bottom-full left-0 right-0 z-10 mb-1"
                  />
                </div>
              </div>
            </form>
          </CardFooter>
        </Card>
        
        <Card className="flex-1">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-md">About Intelligent Suggestions</CardTitle>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="space-y-4">
              <p>The intelligent terminal suggestions system in G.R.I.P. provides:</p>
              
              <div className="space-y-2">
                <h3 className="font-semibold">🔍 Context-Awareness</h3>
                <p className="text-sm text-text-secondary">
                  Suggestions are tailored to your current project, directory, and technology stack.
                  For example, in a React project, you&apos;ll see relevant Next.js commands.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">📚 Command Categories</h3>
                <p className="text-sm text-text-secondary">
                  Commands are categorized as system, project-specific, git, npm/yarn, 
                  or from your command history for easier identification.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">🔄 Learning Capability</h3>
                <p className="text-sm text-text-secondary">
                  The system learns from your command history to provide more relevant 
                  suggestions over time based on your usage patterns.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">📊 Relevance Scoring</h3>
                <p className="text-sm text-text-secondary">
                  Suggestions are ranked by relevance to your current context, placing
                  the most likely commands at the top of the list.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">💡 Command Completion</h3>
                <p className="text-sm text-text-secondary">
                  Type partial commands and get intelligent completions, saving you time
                  and helping you discover new command options.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 