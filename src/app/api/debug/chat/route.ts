import { NextResponse } from 'next/server'
import { clientPromise } from '@/lib/mongodb'

export async function GET(request: Request) {
  try {
    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db('test')
    
    // Get all chatHistory documents
    const chatDocs = await db.collection('chatHistory').find({}).toArray()
    
    // Format for easier viewing
    const formattedDocs = chatDocs.map(doc => ({
      _id: doc._id.toString(),
      projectId: typeof doc.projectId === 'object' ? doc.projectId.toString() : doc.projectId,
      messageCount: doc.messages?.length || 0,
      messages: (doc.messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        contentPreview: msg.content?.substring(0, 100) + '...',
        timestamp: msg.timestamp
      })),
      updatedAt: doc.updatedAt
    }))
    
    return NextResponse.json({ 
      count: chatDocs.length,
      documents: formattedDocs
    })
  } catch (error) {
    console.error('Error in debug route:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve chat documents' },
      { status: 500 }
    )
  }
} 