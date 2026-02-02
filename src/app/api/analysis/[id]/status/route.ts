import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the ID directly from the params object
  const id = params.id;
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Connect to database
    const client = await clientPromise
    const db = client.db('test')
    
    // Check if analysis exists
    const analysis = await db.collection('analysis').findOne({ projectId: id })
    
    if (!analysis) {
      return NextResponse.json({ 
        completed: false,
        message: 'Analysis not found',
        status: 'not_started'
      })
    }
    
    // Check if analysis is still in progress
    const status = analysis.status || 'unknown'
    const isCompleted = status === 'completed'
    
    return NextResponse.json({
      completed: isCompleted,
      status,
      lastUpdated: analysis.updatedAt || analysis.createdAt,
      message: isCompleted ? 'Analysis completed' : 'Analysis in progress',
      progress: analysis.progress || 0
    })
  } catch (error) {
    console.error('Error checking analysis status:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 