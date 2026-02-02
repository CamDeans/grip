'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/hooks/useChat'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/Card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'
import { AIMessage } from '@/types'

export function ChatInterface() {
  const [input, setInput] = useState('')
  const { messages, isLoading, sendMessage } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    try {
      await sendMessage(input)
      setInput('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message: AIMessage, i: number) => (
            <Card key={i} className="p-4">
              <CardContent>
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {message.role === 'user' ? 'U' : 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {message.content}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {isLoading && (
            <Card className="p-4">
              <CardContent>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <div>Thinking...</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  )
} 