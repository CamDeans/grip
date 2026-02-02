import { ObjectId } from 'mongodb'
import { getProjectContext } from '@/lib/services/analysisService'
import { loadChatHistory } from '@/lib/services/chatService'

function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id)
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!isValidObjectId(id)) {
      return new Response('Invalid project ID', { status: 400 })
    }

    // Get project context
    const context = await getProjectContext(id)
    
    // Load chat history
    const history = await loadChatHistory(id)

    return Response.json({ context, history })
  } catch (error) {
    console.error('Error getting project context:', error)
    return new Response('Failed to get project context', { status: 500 })
  }
}
