import { NextResponse } from 'next/server'
import { getRepositoryContentServer } from '@/lib/github'
import { getServerAuthSession } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')
    const path = searchParams.get('path') || ''

    if (!owner || !repo) {
      return NextResponse.json({ error: 'Owner and repo parameters are required' }, { status: 400 })
    }

    const content = await getRepositoryContentServer(owner, repo, path)
    return NextResponse.json(content)
  } catch (error) {
    console.error('GitHub content error:', error)
    return NextResponse.json({ error: 'Failed to fetch repository content' }, { status: 500 })
  }
}
