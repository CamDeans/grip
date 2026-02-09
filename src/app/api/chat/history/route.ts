import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { getChatHistory } from '@/lib/chat'

// Phase 2, Step 2: Create Chat History Fetcher

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const limitParam = url.searchParams.get('limit')

    if (!projectId) {
      return new NextResponse(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400 }
      )
    }

    // Parse limit parameter (cap at 100 for response size)
    const messageLimit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50

    // Fetch chat history using the existing function
    const history = await getChatHistory(projectId)
    
    if (!history) {
      return NextResponse.json({ messages: [] })
    }

    // Normalize messages so each has id, role, content, timestamp (for EnhancedChatProvider)
    const rawMessages = history.messages || []
    const limited = rawMessages.slice(-messageLimit)
    const messages = limited.map((m: any) => ({
      id: m.id || m._id?.toString?.() || String(Date.now() + Math.random()),
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : '',
      timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString(),
      ...(m.metadata && typeof m.metadata === 'object' ? { metadata: m.metadata } : {}),
    }))

    const formattedHistory = {
      projectId: history.projectId,
      messages,
      currentPhase: history.currentPhase,
      currentStep: history.currentStep,
      status: history.status,
      updatedAt: history.updatedAt
    }

    return NextResponse.json(formattedHistory)
  } catch (error: any) {
    console.error('Error fetching chat history:', error)
    
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Remove authentication check for debugging
    // const session = await getServerAuthSession()
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { projectId, messages } = await request.json()
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }
    
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 })
    }

    console.log('API: Processing', messages.length, 'new messages for project:', projectId)
    
    const client = await clientPromise
    const db = client.db('test')
    
    // First, get existing messages
    const existingDoc = await db.collection('chatHistory').findOne({ projectId })
    console.log('API: Found existing chat document:', existingDoc ? 'Yes' : 'No')
    
    const existingMessages = existingDoc?.messages || []
    console.log('API: Existing messages:', existingMessages.length)
    
    // Add new messages with proper IDs
    const newMessages = messages.map(msg => ({
      ...msg,
      id: msg.id || new Date().getTime().toString(), // Ensure ID
      timestamp: msg.timestamp || new Date() // Ensure timestamp
    }))
    
    // Combine existing and new messages
    const allMessages = [...existingMessages, ...newMessages]
    
    // Update the chat history document with the messages array
    const result = await db.collection('chatHistory').updateOne(
      { projectId: projectId }, // Use string projectId
      { 
        $set: { 
          messages: allMessages,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    console.log('API: Chat history saved, result:', JSON.stringify({
      acknowledged: result.acknowledged, 
      totalMessages: allMessages.length,
      newMessages: newMessages.length
    }, null, 2))
    
    if (!result.acknowledged) {
      throw new Error('Failed to update chat history')
    }

    return NextResponse.json({ 
      success: true, 
      messageCount: allMessages.length,
      newMessages: newMessages.length
    })
  } catch (error) {
    console.error('Error saving chat history:', error)
    return NextResponse.json(
      { error: 'Failed to save chat history' },
      { status: 500 }
    )
  }
} 