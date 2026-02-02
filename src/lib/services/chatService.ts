import { clientPromise } from '../mongodb'
import { ObjectId } from 'mongodb'
import { AIMessage } from '@/types'

export async function saveChatHistory(
  projectId: string,
  messages: AIMessage[]
) {
  try {
    const client = await clientPromise
    const db = client.db()

    await db.collection('chatHistory').updateOne(
      { projectId: new ObjectId(projectId) },
      {
        $set: {
          messages,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    return true
  } catch (error) {
    console.error('Error saving chat history:', error)
    return false
  }
}

export async function loadChatHistory(projectId: string) {
  try {
    const client = await clientPromise
    const db = client.db()

    const history = await db.collection('chatHistory').findOne({
      projectId: new ObjectId(projectId)
    })

    return history?.messages || []
  } catch (error) {
    console.error('Error loading chat history:', error)
    return []
  }
} 
