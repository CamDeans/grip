import { getServerAuthSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getOrCloneRepository } from '@/lib/repository'
import { clientPromise } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, owner, repo } = await req.json()

    if (!projectId || !owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Cloning repository:', { owner, repo, projectId })

    // Clone repository and get files
    const files = await getOrCloneRepository(owner, repo, projectId)

    // Store repository data in MongoDB
    const client = await clientPromise
    const db = client.db()

    await db.collection('repositories').updateOne(
      { owner, repo },
      {
        $set: {
          owner,
          repo,
          files,
          lastUpdated: new Date()
        },
        $addToSet: {
          linkedProjects: new ObjectId(projectId)
        }
      },
      { upsert: true }
    )

    // Update project with repository info
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          repository: {
            owner,
            repo,
            clonedAt: new Date()
          }
        }
      }
    )

    console.log('Repository cloned and stored successfully')

    return NextResponse.json({
      success: true,
      message: 'Repository cloned successfully',
      fileCount: files.length
    })
  } catch (error) {
    console.error('Repository cloning error:', error)
    return NextResponse.json(
      { error: 'Failed to clone repository' },
      { status: 500 }
    )
  }
}

// Add endpoint to get repository files
export async function GET(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()

    const repository = await db.collection('repositories').findOne({
      projectId: new ObjectId(projectId)
    })

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(repository.files)
  } catch (error) {
    console.error('Error fetching repository files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch repository files' },
      { status: 500 }
    )
  }
}
