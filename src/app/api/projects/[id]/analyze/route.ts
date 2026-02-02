import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { clientPromise } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { analyzeRepositoryStructure } from '@/lib/analysis'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { repository } = await request.json()
    
    // Start analysis
    const analysis = await analyzeRepositoryStructure(
      repository.owner,
      repository.name,
      params.id
    )

    // Store analysis results
    const client = await clientPromise
    const db = client.db()

    await db.collection('projects').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          analysis,
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error analyzing project:', error)
    return NextResponse.json(
      { error: 'Failed to analyze project' },
      { status: 500 }
    )
  }
}
