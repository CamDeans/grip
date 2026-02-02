'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import { AIMessage, ChatError } from '@/types'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'
import { validateMessage } from '@/lib/validation'

interface AIChatProps {
  projectId: string
  className?: string
}

export function AIChat({ projectId, className }: AIChatProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<ChatError | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, isLoading, sendMessage } = useChat()
  const { isConnected } = useWebSocket(projectId)

  // Handle WebSocket connection status
  useEffect(() => {
    if (!isConnected) {
      setError({
        error: 'WebSocket connection lost',
        status: 503
      })
    } else {
      setError(null)
    }
  }, [isConnected])

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    try {
      // Validate message before sending
      const validationResult = validateMessage(input)
      if (!validationResult.isValid) {
        setError({
          error: validationResult.error || 'Invalid message',
          status: 400
        })
        return
      }

      await sendMessage(input)
      setInput('')
      setError(null)
    } catch (err) {
      console.error('Error sending message:', err)
      setError({
        error: 'Failed to send message',
        status: 500
      })
    }
  }

  const renderMessage = (message: AIMessage) => {
    const isUser = message.role === 'user'
    const hasStepContext = message.stepContext !== undefined

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'flex w-full',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        <div
          className={cn(
            'max-w-[80%] rounded-lg p-4',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {hasStepContext && (
            <div className="mt-2 text-sm opacity-80">
              <p>Phase: {message.stepContext?.phase}</p>
              <p>Step: {message.stepContext?.stepId}</p>
              <p>Status: {message.stepContext?.action.status}</p>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <ScrollArea className="flex-1 p-4">
        <AnimatePresence>
          {messages.map((message) => renderMessage(message))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {error && (
        <div className="bg-destructive/10 p-4 text-destructive">
          {error.error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading || !isConnected}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !isConnected}
            title={!isConnected ? "Waiting for connection..." : "Send message"}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  )
} 