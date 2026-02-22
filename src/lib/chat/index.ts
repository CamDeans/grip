import clientPromise, { DB_NAME } from '../db'
import { serializeDocument } from '../utils'
import { ObjectId, Document } from 'mongodb'

export interface ArtifactReference {
  id: string
  type: 'file' | 'component' | 'service' | 'model' | 'test' | 'documentation'
  path?: string
  name: string
  version?: string
  metadata?: {
    lastModified?: Date
    size?: number
    dependencies?: string[]
    status?: string
  }
}

export interface ChatMessage {
  id: string
  projectId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    phase?: string
    step?: string
    status?: string
    context?: {
      currentFile?: string
      currentComponent?: string
      currentService?: string
      currentPhase?: string
      currentStep?: string
    }
    artifacts?: ArtifactReference[]
    relatedMessages?: string[] // IDs of related messages
    tags?: string[]
    priority?: 'low' | 'medium' | 'high'
    sentiment?: 'positive' | 'neutral' | 'negative'
    actionItems?: Array<{
      type: 'create' | 'modify' | 'delete' | 'review' | 'test'
      target: string
      status: 'pending' | 'completed' | 'failed'
      timestamp?: Date
    }>
  }
}

export interface ChatHistory extends Document {
  projectId: string
  messages: ChatMessage[]
  currentPhase: string
  currentStep: string
  status: string
  updatedAt: Date
  metadata?: {
    totalArtifacts: number
    artifactTypes: Record<string, number>
    lastArtifactUpdate: Date
    messageStats: {
      total: number
      byRole: Record<string, number>
      byPhase: Record<string, number>
      byStep: Record<string, number>
    }
    searchIndex?: {
      lastUpdated: Date
      version: number
    }
  }
}

export async function getChatHistory(projectId: string): Promise<ChatHistory | null> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    console.log('DB: Getting chat history for project:', projectId)
    
    // Try with string project ID first
    let history = await db.collection('chatHistory').findOne({ projectId })
    console.log('DB: Chat history lookup with string ID:', history ? 'Found' : 'Not found')
    
    // If not found, try with ObjectId
    if (!history) {
      try {
        const objId = new ObjectId(projectId)
        history = await db.collection('chatHistory').findOne({ projectId: objId })
        console.log('DB: Chat history lookup with ObjectId:', history ? 'Found' : 'Not found')
      } catch (err) {
        console.error('DB: Invalid ObjectId format:', err)
      }
    }
    
    // List all documents if still not found
    if (!history) {
      const allDocs = await db.collection('chatHistory').find({}).limit(5).toArray()
      console.log('DB: First 5 chat history documents:', JSON.stringify(allDocs.map(doc => ({
        _id: doc._id.toString(),
        projectId: typeof doc.projectId === 'object' ? doc.projectId.toString() : doc.projectId,
        messageCount: doc.messages?.length || 0
      })), null, 2))
    }
    
    return history ? serializeDocument(history) as ChatHistory : null
  } catch (error) {
    console.error('Error getting chat history:', error)
    throw error
  }
}

export async function addChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
  try {
    const client = await clientPromise
    const db = client.db()

    const newMessage = {
      ...message,
      id: new ObjectId().toString(),
      timestamp: new Date()
    }

    // Update chat history with new message
    await db.collection<ChatHistory>('chatHistory').updateOne(
      { projectId: message.projectId },
      {
        $push: { messages: newMessage } as any,
        $set: { 
          updatedAt: new Date(),
          'metadata.totalArtifacts': { $add: ['$metadata.totalArtifacts', message.metadata?.artifacts?.length || 0] },
          'metadata.lastArtifactUpdate': new Date(),
          'metadata.messageStats.total': { $add: ['$metadata.messageStats.total', 1] },
          [`metadata.messageStats.byRole.${message.role}`]: { $add: [`$metadata.messageStats.byRole.${message.role}`, 1] }
        }
      },
      { upsert: true }
    )

    // Update artifact references if present
    if (message.metadata?.artifacts?.length) {
      await db.collection('artifacts').updateMany(
        { 
          _id: { 
            $in: message.metadata.artifacts.map(a => new ObjectId(a.id)) 
          }
        },
        {
          $push: {
            references: {
              messageId: newMessage.id,
              timestamp: new Date(),
              context: message.metadata.context
            } as any
          }
        }
      )
    }

    return newMessage
  } catch (error) {
    console.error('Error adding chat message:', error)
    throw error
  }
}

export async function updateChatState(
  projectId: string,
  phase: string,
  step: string,
  status: string
): Promise<void> {
  try {
    const client = await clientPromise
    const db = client.db()

    await db.collection('chatHistory').updateOne(
      { projectId },
      {
        $set: {
          currentPhase: phase,
          currentStep: step,
          status,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )
  } catch (error) {
    console.error('Error updating chat state:', error)
    throw error
  }
}

export async function clearChatHistory(projectId: string): Promise<void> {
  try {
    const client = await clientPromise
    const db = client.db()

    await db.collection('chatHistory').deleteOne({ projectId })
  } catch (error) {
    console.error('Error clearing chat history:', error)
    throw error
  }
}

export async function initializeChatHistory(projectId: string): Promise<ChatHistory> {
  try {
    const client = await clientPromise
    const db = client.db()

    const initialHistory: ChatHistory = {
      projectId,
      messages: [],
      currentPhase: 'initial_chat',
      currentStep: 'welcome',
      status: 'active',
      updatedAt: new Date()
    }

    await db.collection('chatHistory').insertOne(initialHistory)
    return initialHistory
  } catch (error) {
    console.error('Error initializing chat history:', error)
    throw error
  }
}

export async function searchChatHistory(
  projectId: string,
  query: {
    text?: string
    artifacts?: string[]
    phases?: string[]
    steps?: string[]
    tags?: string[]
    dateRange?: { start: Date; end: Date }
  }
): Promise<ChatMessage[]> {
  try {
    const client = await clientPromise
    const db = client.db()

    const filter: any = { projectId }
    
    if (query.text) {
      filter['messages.content'] = { $regex: query.text, $options: 'i' }
    }
    
    if (query.artifacts?.length) {
      filter['messages.metadata.artifacts.id'] = { $in: query.artifacts }
    }
    
    if (query.phases?.length) {
      filter['messages.metadata.phase'] = { $in: query.phases }
    }
    
    if (query.steps?.length) {
      filter['messages.metadata.step'] = { $in: query.steps }
    }
    
    if (query.tags?.length) {
      filter['messages.metadata.tags'] = { $in: query.tags }
    }
    
    if (query.dateRange) {
      filter['messages.timestamp'] = {
        $gte: query.dateRange.start,
        $lte: query.dateRange.end
      }
    }

    const history = await db.collection('chatHistory').findOne(filter)
    return history?.messages || []
  } catch (error) {
    console.error('Error searching chat history:', error)
    throw error
  }
} 