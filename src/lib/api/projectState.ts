import { AIMessage } from '@/types/chat'
import type { IProjectStateData } from '../models/ProjectState'

export async function getProjectState(projectId: string): Promise<IProjectStateData | null> {
  try {
    console.log('Client: Fetching project state for ID:', projectId)
    const response = await fetch(`/api/project-state?projectId=${projectId}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Client: No project state found for ID:', projectId)
        return null
      }
      const error = await response.text()
      console.error('Client: Failed to get project state:', {
        status: response.status,
        statusText: response.statusText,
        error
      })
      throw new Error(`Failed to get project state: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // In case the response is null or undefined
    if (!data) {
      console.log('Client: Project state API returned null or undefined')
      return null
    }
    
    console.log('Client: Raw project state response:', JSON.stringify({
      projectId: data.projectId?.toString(),
      _id: data._id?.toString(),
      currentPhase: data.currentPhase,
      chatHistoryType: data.chatHistory ? (Array.isArray(data.chatHistory) ? 'array' : typeof data.chatHistory) : 'undefined',
      chatHistoryLength: data.chatHistory?.length || 0,
      firstChatMessage: data.chatHistory?.length > 0 ? {
        id: data.chatHistory[0].id,
        role: data.chatHistory[0].role,
        contentPreview: data.chatHistory[0].content?.substring(0, 50) + '...'
      } : 'none'
    }, null, 2))
    
    console.log('Client: Successfully retrieved project state:', {
      currentPhase: data.currentPhase,
      messageCount: data.chatHistory?.length || 0
    })
    return data
  } catch (error) {
    console.error('Client Error in getProjectState:', error)
    return null
  }
}

export async function initializeProjectState(projectId: string): Promise<IProjectStateData | null> {
  try {
    console.log('Client: Initializing project state for ID:', projectId)
    const response = await fetch('/api/project-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Client: Failed to initialize project state:', {
        status: response.status,
        statusText: response.statusText,
        error
      })
      throw new Error(`Failed to initialize project state: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Client: Successfully initialized project state:', {
      currentPhase: data.currentPhase,
      messageCount: data.chatHistory?.length || 0
    })
    return data
  } catch (error) {
    console.error('Client Error in initializeProjectState:', error)
    return null
  }
}

export async function getChatHistory(projectId: string): Promise<AIMessage[]> {
  try {
    console.log('Client: Fetching chat history for ID:', projectId)
    const response = await fetch(`/api/chat/history?projectId=${projectId}`)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Client: Failed to get chat history:', {
        status: response.status,
        statusText: response.statusText,
        error
      })
      throw new Error(`Failed to get chat history: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Client: Raw chat history response:', data)
    
    if (!data.messages || !Array.isArray(data.messages)) {
      console.warn('Client: Unexpected format - messages property missing or not an array')
      return []
    }
    
    console.log('Client: Successfully retrieved chat history:', {
      messageCount: data.messages.length,
      firstMessageTimestamp: data.messages[0]?.timestamp,
      lastMessageTimestamp: data.messages[data.messages.length - 1]?.timestamp
    })
    return data.messages
  } catch (error) {
    console.error('Client Error in getChatHistory:', error)
    return []
  }
}

export async function addChatMessage(projectId: string, message: AIMessage): Promise<boolean> {
  try {
    console.log('Client: Adding chat message for ID:', projectId, {
      messageRole: message.role,
      messageLength: message.content.length
    })
    
    const response = await fetch('/api/chat/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        projectId, 
        messages: [message]
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Client: Failed to add chat message:', {
        status: response.status,
        statusText: response.statusText,
        error
      })
      throw new Error(`Failed to add chat message: ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('Client: Successfully added chat message:', {
      success: result.success,
      messageCount: result.messageCount || 1
    })
    return result.success
  } catch (error) {
    console.error('Client Error in addChatMessage:', error)
    return false
  }
} 