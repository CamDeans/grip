import { getServerAuthSession } from '@/lib/auth'
import { analyzeRepositoryStructure, generateCodeSuggestions } from '@/lib/analysis'
import { NextResponse } from 'next/server'
import { clientPromise } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId: projectIdString, owner, repo } = await req.json()
    const projectId = new ObjectId(projectIdString)

    const analysis = await analyzeRepositoryStructure(owner, repo, projectIdString)
    const analysisString = JSON.stringify(analysis)
    const suggestions = await generateCodeSuggestions(analysisString)

    const client = await clientPromise
    const db = client.db()

    await db.collection('analyses').insertOne({
      projectId,
      analysis,
      suggestions,
      status: 'completed',
      createdAt: new Date(),
    })

    return NextResponse.json({ analysis, suggestions })
  } catch (error) {
    console.error('Enhanced analysis error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
