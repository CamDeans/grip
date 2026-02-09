import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const client = await clientPromise
    const db = client.db()

    // Only count projects owned by the current user
    const projects = await db.collection('projects').find({ userId: session.user.id }).toArray()
    const projectObjectIds = projects.map((p: { _id: ObjectId }) => p._id)

    const activeProjects = projects.filter((p: { status?: string }) => (p.status ?? 'active') === 'active').length
    const completedProjects = projects.filter((p: { status?: string }) => p.status === 'completed').length
    const totalProjects = projects.length

    // Build sessions and terminal sessions for this user's projects only (support both ObjectId and string projectId)
    const buildLogs = projectObjectIds.length > 0
      ? await db.collection('buildLogs').find({ projectId: { $in: projectObjectIds } }).toArray()
      : []
    const terminalSessions = projectObjectIds.length > 0
      ? await db.collection('terminalSessions').find({ projectId: { $in: projectObjectIds } }).toArray()
      : []

    const stats = {
      activeProjects: activeProjects || 0,
      completedProjects: completedProjects || 0,
      totalProjects: totalProjects || 0,
      totalBuilds: buildLogs.length || 0,
      terminalSessions: terminalSessions.length || 0,
    }

    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    )
  }
} 