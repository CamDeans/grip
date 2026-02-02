'use client'

/**
 * Terminal-Chat Bridge Test Page
 * Part of Phase 6, Step 4 of G.R.I.P. Enhancement Plan - Create Terminal-Chat Bridge
 * 
 * This test page demonstrates the functionality of the Terminal-Chat Bridge component,
 * showing how terminal commands and outputs can be shared with the chat interface and
 * how commands can be executed from the chat.
 */

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Terminal as TerminalIcon, MessageSquare, Share2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { v4 as uuidv4 } from 'uuid'
import { TerminalChatBridge } from '@/components/terminal/TerminalChatBridge'
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider'

interface CommandHistory {
  command: string
  output: string
  timestamp: Date
  exitCode: number
}

export default function TerminalChatBridgeTest() {
  // Terminal state
  const [terminalId] = useState(() => `term_${uuidv4()}`)
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<CommandHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentDirectory, setCurrentDirectory] = useState('/home/user')
  const [projectId] = useState('bridge-test-project')
  
  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    {
      role: 'assistant',
      content: 'Welcome to the Terminal-Chat Bridge test! Try running commands in the terminal and sharing them with the chat. You can also send commands from the chat to the terminal.'
    }
  ])
  const [chatInput, setChatInput] = useState('')
  
  const lastCommand = history.length > 0 ? history[history.length - 1] : undefined
  
  // Create a session when the component mounts
  useEffect(() => {
    createTerminalSession()
  }, [])
  
  // Create a terminal session
  const createTerminalSession = async () => {
    try {
      const response = await fetch('/api/terminal/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bridge Test Terminal',
          projectId,
          purpose: 'Testing Terminal-Chat Bridge'
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create terminal session')
      }
      
      const data = await response.json()
      console.log('Session created:', data)
      
      // Add welcome message to history
      setHistory([{
        command: '',
        output: 'Terminal session initialized. Type commands below and share them with the chat.',
        timestamp: new Date(),
        exitCode: 0
      }])
    } catch (error) {
      console.error('Error creating terminal session:', error)
    }
  }
  
  // Execute a terminal command
  const executeCommand = async (cmd: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/terminal/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: terminalId,
          command: cmd
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to execute command')
      }
      
      const data = await response.json()
      
      const commandHistory: CommandHistory = {
        command: cmd,
        output: data.output || 'Command executed successfully with no output',
        timestamp: new Date(),
        exitCode: data.exitCode || 0
      }
      
      setHistory(prev => [...prev, commandHistory])
      
      if (data.currentDirectory) {
        setCurrentDirectory(data.currentDirectory)
      }
      
      return commandHistory
    } catch (error) {
      console.error('Error executing command:', error)
      
      const errorHistory: CommandHistory = {
        command: cmd,
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        exitCode: 1
      }
      
      setHistory(prev => [...prev, errorHistory])
      return errorHistory
    } finally {
      setIsLoading(false)
      setCommand('')
    }
  }
  
  // Handle terminal form submission
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!command.trim()) return
    
    executeCommand(command.trim())
  }
  
  // Handle chat form submission
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: chatInput }])
    
    // Check if it's a command for the terminal
    const commandMatch = chatInput.match(/^\/terminal (.+)$/i)
    if (commandMatch) {
      const termCommand = commandMatch[1]
      
      // Add assistant message acknowledging the command
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Executing command in terminal: \`${termCommand}\`` 
      }])
      
      // Execute the command
      executeCommand(termCommand).then(result => {
        // Add the result
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `
Command: \`${termCommand}\`

Output:
\`\`\`
${result.output}
\`\`\`

Exit code: ${result.exitCode}
`
        }])
      })
    } else {
      // Simulate AI response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I received your message: "${chatInput}". To run a terminal command, type /terminal followed by your command.` 
      }])
    }
    
    setChatInput('')
  }
  
  return (
    <EnhancedChatProvider projectId={projectId}>
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Terminal-Chat Bridge Test</h1>
        <p className="mb-4">
          This page tests the Phase 6, Step 4 implementation of the Terminal-Chat Bridge.
          Use the terminal below to run commands, then share them with the chat.
          You can also send commands from the chat to the terminal using &apos;/terminal&apos; prefix.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Terminal Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
              <div className="flex items-center">
                <TerminalIcon className="h-5 w-5 mr-2 text-primary" />
                <CardTitle className="text-md">Terminal</CardTitle>
                <Badge variant="outline" className="ml-2 text-xs">
                  {currentDirectory}
                </Badge>
              </div>
              <Badge variant="outline">ID: {terminalId}</Badge>
            </CardHeader>
            
            <CardContent className="pt-4 pb-0">
              <ScrollArea className="h-[400px]">
                <div className="font-mono text-sm whitespace-pre-wrap">
                  {history.map((item, index) => (
                    <div key={index} className="mb-4">
                      {item.command && (
                        <div className="text-success">$ {item.command}</div>
                      )}
                      <div className="mt-1">{item.output}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="border-t p-3">
              <form onSubmit={handleTerminalSubmit} className="flex w-full items-center gap-2">
                <div className="flex items-center flex-1">
                  <span className="text-success mr-2">$</span>
                  <Input
                    value={command}
                    onChange={e => setCommand(e.target.value)}
                    placeholder="Enter command..."
                    className="flex-1 font-mono bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" disabled={isLoading || !command.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run'}
                </Button>
              </form>
            </CardFooter>
          </Card>
          
          {/* Chat Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-accent-blue" />
                <CardTitle className="text-md">Chat</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="pt-4 pb-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
            
            <CardFooter className="border-t p-3">
              <form onSubmit={handleChatSubmit} className="flex w-full items-center gap-2">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message or /terminal <command>..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!chatInput.trim()}>
                  Send
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
        
        {/* Bridge Component */}
        <div className="mt-6">
          <Card>
            <CardHeader className="py-3 border-b">
              <div className="flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-success" />
                <CardTitle className="text-md">Terminal-Chat Bridge</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="py-4">
              {lastCommand ? (
                <TerminalChatBridge
                  terminalId={terminalId}
                  lastCommand={lastCommand}
                  onExecuteCommand={async (cmd) => {
                    await executeCommand(cmd);
                  }}
                />
              ) : (
                <p className="text-sm text-text-muted">
                  Run a command in the terminal to see the bridge in action
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </EnhancedChatProvider>
  )
} 