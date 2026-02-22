import { clientPromise, DB_NAME } from '../mongodb'
import { ObjectId } from 'mongodb'
import { AIMessage } from '@/types'

export async function saveChatHistory(projectId: string, messages: AIMessage[]) {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    console.log('Saving chat history for project:', projectId)
    console.log('Messages to save:', messages.length)

    const result = await db.collection('chatHistory').updateOne(
      { projectId: new ObjectId(projectId) },
      {
        $set: {
          messages,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    console.log('Save result:', result)
    return true
  } catch (error) {
    console.error('Error saving chat history:', error)
    return false
  }
}

export async function loadChatHistory(projectId: string): Promise<AIMessage[]> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    console.log('Loading chat history for project:', projectId)

    const history = await db.collection('chatHistory').findOne({
      projectId: new ObjectId(projectId)
    })

    console.log('Found chat history:', history)
    return history?.messages || []
  } catch (error) {
    console.error('Error loading chat history:', error)
    return []
  }
} 
