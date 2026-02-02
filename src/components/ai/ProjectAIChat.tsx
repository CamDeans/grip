'use client'

import { useState, useEffect } from 'react'
import { useToast } from '../providers/ToastProvider'
import { CodePreview } from '../preview/CodePreview'
import { ArrowDownTrayIcon, CodeBracketIcon } from '@heroicons/react/24/outline'

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

export function ProjectAIChat({ projectId, initialContext, autoStart }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [previewCode, setPreviewCode] = useState<{file: string, content: string, language: string} | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCodeView, setShowCodeView] = useState(false)
  const { showToast } = useToast()

  // Load chat history when component mounts or projectId changes
  useEffect(() => {
    const loadChatHistory = async () => {
      setIsLoadingHistory(true)
      try {
        console.log('Loading chat history for project:', projectId)
        const response = await fetch(`/api/chat/history?projectId=${projectId}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Loaded chat history:', data)
          
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })))
          } else if (autoStart && initialContext) {
            // Initialize new chat if no history exists
            const contextString = typeof initialContext === 'string' 
              ? initialContext
              : JSON.stringify(initialContext, null, 2)

            const initialMessage = {
              role: 'assistant' as const,
              content: `I've analyzed your project. Here's what I found:\n\n${contextString}\n\nHow would you like to proceed with improving this project?`,
              timestamp: new Date()
            }
            setMessages([initialMessage])
            await saveChatHistory([initialMessage])
          }
        } else {
          throw new Error('Failed to load chat history')
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
        showToast('Failed to load chat history', 'error')
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadChatHistory()
  }, [projectId, autoStart, initialContext, showToast])

  const saveChatHistory = async (messagesToSave: Message[]) => {
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages: messagesToSave,
          context: initialContext
        })
      })

      if (!response.ok) throw new Error('Failed to save chat history')
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving chat history:', error)
      showToast('Failed to save chat history', 'error')
    }
  }

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
    setHasUnsavedChanges(true)

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
      await saveChatHistory(newMessages)

      if (data.codeChanges && data.codeChanges.length > 0) {
        setPreviewCode(data.codeChanges[0])
        setShowCodeView(true)
      }
    } catch (error) {
      console.error('Chat error:', error)
      showToast('Failed to get AI response', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text-muted">Loading chat history...</div>
      </div>
    )
  }

  const handleSaveChat = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          messages,
          context: initialContext
        })
      })

      if (!response.ok) throw new Error('Failed to save chat history')
      
      setHasUnsavedChanges(false)
      showToast('Chat history saved successfully', 'success')
    } catch (error) {
      console.error('Error saving chat:', error)
      showToast('Failed to save chat history', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCode = async (codeChanges: any[]) => {
    try {
      const response = await fetch('/api/projects/save-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          changes: codeChanges
        }),
      })

      if (!response.ok) throw new Error('Failed to save code changes')
      showToast('Code changes saved successfully', 'success')
    } catch (error) {
      console.error('Error saving code:', error)
      showToast('Failed to save code changes', 'error')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-primary">AI Assistant</h3>
          <button
            onClick={() => setShowCodeView(!showCodeView)}
            className="flex items-center px-3 py-1 text-sm bg-background-tertiary text-white rounded hover:bg-background-tertiary"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            {showCodeView ? 'Hide Code' : 'Show Code'}
          </button>
        </div>
        {hasUnsavedChanges && (
          <button
            onClick={handleSaveChat}
            disabled={isSaving}
            className="flex items-center px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Chat'}
          </button>
        )}
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Messages */}
        <div className={`flex-1 overflow-y-auto bg-background-secondary rounded-lg p-4 ${showCodeView ? 'w-1/2' : 'w-full'}`}>
          <div className="space-y-4">
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
                      ? 'bg-primary text-white'
                      : 'bg-background-tertiary text-text-primary'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans">
                    {message.content}
                  </pre>
                  {message.codeChanges && message.codeChanges.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm font-medium text-primary">
                        Code Changes:
                      </div>
                      {message.codeChanges.map((change, index) => (
                        <div key={index} className="space-y-1">
                          <button
                            onClick={() => setPreviewCode(change)}
                            className="text-sm text-primary hover:text-primary-dark"
                          >
                            View changes to {change.file}
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleSaveCode(message.codeChanges || [])}
                        className="mt-2 w-full px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark"
                      >
                        Apply Changes
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
        </div>

        {/* Code Preview */}
        {showCodeView && (
          <div className="w-1/2 bg-background-secondary rounded-lg p-4">
            <div className="h-full">
              {previewCode ? (
                <CodePreview
                  code={previewCode.content}
                  language={previewCode.language}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-text-muted">
                  <p>Select code changes to preview</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-4">
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
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
