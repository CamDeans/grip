import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

const CONFIRM_PHRASE = 'DELETE'

/**
 * POST /api/user/delete-data
 * Delete all data belonging to the user (projects, project files, chat, build logs, etc.).
 * Requires body: { confirmPhrase: "DELETE" }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { confirmPhrase } = body || {}
    if (confirmPhrase !== CONFIRM_PHRASE) {
      return NextResponse.json(
        { error: 'Confirmation phrase does not match. Type DELETE exactly to confirm.' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const userId = session.user.id
    const userEmail = session.user.email

    const projects = await db.collection('projects').find({ userId }).toArray()
    const projectIds = projects.map((p: { _id: unknown }) => p._id)
    const sandboxProjects = await db.collection('sandboxProjects').find({ userId }).toArray()
    const sandboxIds = sandboxProjects.map((p: { _id: unknown }) => p._id)

    if (projectIds.length > 0) {
      await db.collection('projectFiles').deleteMany({ projectId: { $in: projectIds } })
      await db.collection('chatHistory').deleteMany({ projectId: { $in: projectIds } })
      await db.collection('buildLogs').deleteMany({ projectId: { $in: projectIds } })
      await db.collection('analyses').deleteMany({ projectId: { $in: projectIds } })
      await db.collection('projectStates').deleteMany({ projectId: { $in: projectIds } })
      await db.collection('terminalSessions').deleteMany({ projectId: { $in: projectIds } })
      await db.collection('projects').deleteMany({ _id: { $in: projectIds } })
    }

    if (sandboxIds.length > 0) {
      await db.collection('sandboxProjects').deleteMany({ _id: { $in: sandboxIds } })
    }

    if (userEmail) {
      await db.collection('notifications').deleteMany({ userId: userEmail })
    }

    return NextResponse.json({ success: true, message: 'All your data has been deleted.' })
  } catch (error) {
    console.error('Delete data error:', error)
    return NextResponse.json(
      { error: 'Failed to delete data. Please try again.' },
      { status: 500 }
    )
  }
}
