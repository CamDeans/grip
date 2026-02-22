import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { analyzeRepositoryStructure } from '@/lib/analysis'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const { id } = await params
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const repository = body?.repository
    if (!repository?.owner || !repository?.name) {
      return NextResponse.json(
        { error: 'Missing repository (owner and name required)' },
        { status: 400 }
      )
    }

    const { analysis, totalTokens } = await analyzeRepositoryStructure(
      repository.owner,
      repository.name,
      id
    )

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const projectIdObj = new ObjectId(id)

    await db.collection('analyses').updateOne(
      { projectId: projectIdObj },
      {
        $set: {
          projectId: projectIdObj,
          repositoryAnalysis: analysis,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    await db.collection('projects').updateOne(
      { _id: projectIdObj },
      {
        $set: {
          analysis,
          updatedAt: new Date(),
        },
      }
    )

    if (totalTokens > 0 && session.user?.id) {
      await addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Project analyze: failed to record token usage', err)
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error analyzing project:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze project'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
