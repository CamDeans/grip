import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
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
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const { projectId: projectIdString, owner, repo } = await req.json()
    const projectId = new ObjectId(projectIdString)

    const { analysis, totalTokens: analysisTokens } = await analyzeRepositoryStructure(owner, repo, projectIdString)
    const analysisString = JSON.stringify(analysis)
    const { suggestions, totalTokens: suggestionsTokens } = await generateCodeSuggestions(analysisString)

    const totalTokens = analysisTokens + suggestionsTokens
    if (totalTokens > 0 && session.user?.id) {
      await addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Enhanced analysis: failed to record token usage', err)
      )
    }

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
