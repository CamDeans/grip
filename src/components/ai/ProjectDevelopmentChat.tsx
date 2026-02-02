'use client'

import { useState, useEffect } from 'react'
import { useToast } from '../providers/ToastProvider'
import { CodePreview } from '../preview/CodePreview'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  codeChanges?: {
    file: string
    content: string
    language: string
  }[]
}

interface Props {
  projectId: string
  initialContext?: any
  autoStart?: boolean
}

export function ProjectDevelopmentChat({ projectId, initialContext, autoStart }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [previewCode, setPreviewCode] = useState<{file: string, content: string, language: string} | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/chat/history?projectId=${projectId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })))
            return
          }
        }

        // Initialize new chat if no history exists
        if (autoStart && initialContext) {
          const contextString = typeof initialContext === 'string' 
            ? initialContext
            : JSON.stringify(initialContext, null, 2)

          const initialMessage = {
            role: 'assistant' as const,
            content: `I&apos;ll help you develop this project based on your requirements:\n\n${contextString}\n\nLet&apos;s start by outlining the implementation plan. Would you like me to:
1. Create the initial project structure
2. Implement a specific feature
3. Review and improve existing code
4. Set up testing and deployment

Please let me know how you&apos;d like to proceed.`,
            timestamp: new Date()
          }
          setMessages([initialMessage])
          
          await fetch('/api/chat/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              messages: [initialMessage],
              context: initialContext
            })
          })
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
        showToast('Failed to load chat history', 'error')
      }
    }

    loadChatHistory()
  }, [projectId, autoStart, initialContext, showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { 
      role: 'user' as const, 
      content: input,
      timestamp: new Date()
    }
    
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat/develop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: input,
          history: messages,
          context: initialContext
        }),
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      const data = await response.json()
      
      const aiMessage = {
        role: 'assistant' as const,
        content: data.response,
        timestamp: new Date(),
        codeChanges: data.codeChanges
      }

      const newMessages = [...updatedMessages, aiMessage]
      setMessages(newMessages)

      // If there are code changes, show the preview of the first one
      if (data.codeChanges && data.codeChanges.length > 0) {
        setPreviewCode(data.codeChanges[0])
      }

      // Save updated chat history
      await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages: newMessages,
          context: initialContext
        })
      })
    } catch (error) {
      console.error('Chat error:', error)
      showToast('Failed to get AI response', 'error')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveChanges = async (codeChanges: any[]) => {
    try {
      const response = await fetch('/api/projects/save-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          changes: codeChanges
        }),
      })

      if (!response.ok) throw new Error('Failed to save changes')
      
      showToast('Changes saved successfully', 'success')
    } catch (error) {
      console.error('Error saving changes:', error)
      showToast('Failed to save changes', 'error')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-24rem)]">
      <div className="flex-1 flex gap-4">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background-secondary rounded-lg">
          {messages.map((message, i) => (
            <div
              key={`${message.timestamp.getTime()}-${i}`}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background-tertiary text-text-primary'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">
                  {message.content}
                </pre>
                {message.codeChanges && (
                  <div className="mt-4 space-y-2">
                    {message.codeChanges.map((change, index) => (
                      <button
                        key={index}
                        onClick={() => setPreviewCode(change)}
                        className="text-sm text-primary hover:text-primary-dark"
                      >
                        Preview changes to {change.file}
                      </button>
                    ))}
                    <button
                      onClick={() => handleSaveChanges(message.codeChanges || [])}
                      className="mt-2 w-full px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary-hover"
                    >
                      Save All Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-background-tertiary text-text-primary rounded-lg px-4 py-2">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Code Preview */}
        {previewCode && (
          <div className="w-1/2 bg-background-secondary rounded-lg p-4">
            <CodePreview
              code={previewCode.content}
              language={previewCode.language}
            />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-border">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you want to build or modify..."
            className="flex-1 rounded-md bg-background-secondary text-text-primary border-border focus:border-primary focus:ring-primary"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary-hover"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
