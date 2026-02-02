import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Phase 2, Step 3: Create Project Structure Data Fetcher

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      )
    }

    const { id } = await params

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid project ID format' }),
        { status: 400 }
      )
    }

    // Connect to database
    const client = await clientPromise
    const db = client.db('test')

    // Find project structure
    const structure = await db.collection('projectStructures').findOne({
      projectId: new ObjectId(id)
    })

    if (!structure) {
      return new NextResponse(
        JSON.stringify({ error: 'Project structure not found' }),
        { status: 404 }
      )
    }

    return NextResponse.json(structure)
  } catch (error: any) {
    console.error('Error loading project structure:', error)
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500 }
    )
  }
}