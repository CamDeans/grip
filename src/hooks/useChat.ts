import { useState } from 'react'
import { AIMessage } from '@/types'

export function useChat() {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (content: string) => {
    try {
      setIsLoading(true)
      
      // Add user message
      const userMessage: AIMessage = {
        id: Math.random().toString(36).slice(2),
        role: 'user',
        content,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])

      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Add AI response
      const aiMessage: AIMessage = {
        id: Math.random().toString(36).slice(2),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        stepContext: data.stepContext
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages,
    isLoading,
    sendMessage
  }
} 