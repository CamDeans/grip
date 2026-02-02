'use client'

/**
 * Terminal-Chat Bridge Component
 * Part of Phase 6, Step 4 of G.R.I.P. Enhancement Plan - Create Terminal-Chat Bridge
 * 
 * This component links terminal interactions with chat conversations, allowing:
 * - Sharing terminal commands and outputs with the chat interface
 * - Executing terminal commands from the chat interface
 * - Providing context from the terminal to AI responses
 */

import { useEffect, useState, Fragment } from 'react'
import { useSession } from 'next-auth/react'
import { TerminalChatBridgeService } from '@/lib/services/terminalChatBridgeService'
import { Button } from '@/components/ui'
import { TerminalIcon, MessageSquare, Share2, Settings, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, Transition } from '@headlessui/react'
import { formatTime } from '@/lib/utils/dateUtils'
import { ClientTime } from '@/components/ui/ClientOnly'

interface CommandResult {
  success: boolean
  command: string
  terminalId: string
  timestamp: Date
  output: string
  exitCode: number
}

interface TerminalChatBridgeProps {
  terminalId: string
  projectId: string
  onCommandExecuted?: (command: string, output: string, exitCode: number) => void
  onCommandShared?: (command: string, output: string, exitCode: number) => void
}

export function TerminalChatBridge({
  terminalId,
  projectId,
  onCommandExecuted,
  onCommandShared
}: TerminalChatBridgeProps) {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [autoShare, setAutoShare] = useState(false)
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    if (!session?.user) return

    // Initialize WebSocket connection
    const initializeWebSocket = async () => {
      try {
        // Get WebSocket URL from environment or use default
        const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 
          `ws://${window.location.hostname}:${process.env.NEXT_PUBLIC_WS_PORT || 3001}`
        
        const ws = new WebSocket(
          `${wsUrl}/api/terminal/bridge?terminalId=${terminalId}`
        )

        ws.onopen = () => {
          setIsConnected(true)
          setError(null)
          console.log('WebSocket connection established')
        }

        ws.onclose = (event) => {
          setIsConnected(false)
          console.log('WebSocket connection closed:', event.code, event.reason)
          
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (!ws || ws.readyState === WebSocket.CLOSED) {
              console.log('Attempting to reconnect...')
              initializeWebSocket()
            }
          }, 5000)
        }

        ws.onerror = (event) => {
          setError('WebSocket connection error')
          console.error('WebSocket error:', event)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'command_executed' && onCommandExecuted) {
              onCommandExecuted(data.command, data.output, data.exitCode)
            } else if (data.type === 'command_shared' && onCommandShared) {
              onCommandShared(data.command, data.output, data.exitCode)
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        setWs(ws)

        return () => {
          if (ws) {
            ws.close()
          }
        }
      } catch (error) {
        setError('Failed to initialize WebSocket connection')
        console.error('WebSocket initialization error:', error)
      }
    }

    initializeWebSocket()
  }, [session, terminalId, onCommandExecuted, onCommandShared])

  // Load auto-share setting from localStorage on component mount
  useEffect(() => {
    const storedAutoShare = localStorage.getItem('terminal_auto_share') === 'true'
    setAutoShare(storedAutoShare)
  }, [])
  
  // Save auto-share setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('terminal_auto_share', String(autoShare))
  }, [autoShare])

  // Share a command with chat
  const shareCommand = async (command: string, output: string, exitCode: number) => {
    if (!session?.user) return

    try {
      await TerminalChatBridgeService.shareCommand({
        terminalId,
        projectId,
        command,
        output,
        exitCode,
        userId: session.user.id || session.user.email || 'unknown'
      })
    } catch (error) {
      setError('Failed to share command with chat')
      console.error('Command sharing error:', error)
    }
  }

  // Execute a command from chat
  const executeCommand = async (command: string) => {
    if (!session?.user) return

    try {
      const result = await TerminalChatBridgeService.executeCommand({
        terminalId,
        command,
        userId: session.user.id || session.user.email || 'unknown'
      })

      if (onCommandExecuted) {
        onCommandExecuted(result.command, result.output, result.exitCode)
      }

      // If auto-share is enabled, share the command with chat
      if (autoShare) {
        await shareCommand(result.command, result.output, result.exitCode)
      }
    } catch (error) {
      setError('Failed to execute command from chat')
      console.error('Command execution error:', error)
    }
  }

  if (!isConnected) {
    return (
      <div className="terminal-chat-bridge">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        {!isConnected && (
          <div className="connection-status">
            Connecting to chat bridge...
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="my-2 px-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Badge variant="outline" className="mr-2">
            <TerminalIcon className="w-3 h-3 mr-1" />
            Terminal
          </Badge>
          <span className="text-xs text-text-muted">
            <ClientTime time={new Date()} />
          </span>
        </div>
        
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Terminal Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() => shareCommand(terminalId, '', 0)}
          >
            Share with Chat
          </Button>
        </div>
      </div>
      
      {/* Terminal Settings Dialog */}
      <Transition.Root show={isSettingsOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setIsSettingsOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-background-primary p-6 text-left align-middle shadow-xl transition-all border border-border">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-text-primary"
                  >
                    Terminal Settings
                  </Dialog.Title>
                  <div className="mt-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto-share"
                        checked={autoShare}
                        onCheckedChange={setAutoShare}
                      />
                      <Label htmlFor="auto-share">Auto-share commands with chat</Label>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsSettingsOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  )
} 