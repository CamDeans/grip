import { getServerAuthSession } from '@/lib/auth'
import { clientPromise } from '@/lib/mongodb'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

interface IdeationData {
  goals: string;
  targetAudience: string;
  keyFeatures: string[];
  technicalRequirements: string[];
  description: string;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ideationData: IdeationData = await req.json()
    const client = await clientPromise
    const db = client.db()

    console.log('Saving ideation data for project:', params.id)

    // Update project with ideation data
    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ideation: ideationData,
          updatedAt: new Date(),
          status: 'ideation_completed'
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Initialize or update chat with new ideation context
    await db.collection('chatHistory').updateOne(
      { projectId: new ObjectId(params.id) },
      {
        $set: {
          context: JSON.stringify({
            ...ideationData,
            lastUpdated: new Date()
          }),
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Ideation data saved successfully'
    })
  } catch (error) {
    console.error('Error saving ideation data:', error)
    return NextResponse.json(
      { error: 'Failed to save ideation data' },
      { status: 500 }
    )
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    const project = await db.collection('projects').findOne(
      { _id: new ObjectId(params.id) },
      { projection: { ideation: 1 } }
    )

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project.ideation || {})
  } catch (error) {
    console.error('Error fetching ideation data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ideation data' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates: Partial<IdeationData> = await req.json()
    const client = await clientPromise
    const db = client.db()

    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          'ideation': updates,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update chat context with new ideation data
    await db.collection('chatHistory').updateOne(
      { projectId: new ObjectId(params.id) },
      {
        $set: {
          context: JSON.stringify({
            ...updates,
            lastUpdated: new Date()
          }),
          lastUpdated: new Date()
        }
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Ideation data updated successfully'
    })
  } catch (error) {
    console.error('Error updating ideation data:', error)
    return NextResponse.json(
      { error: 'Failed to update ideation data' },
      { status: 500 }
    )
  }
}
