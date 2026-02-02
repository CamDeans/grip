import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'

/**
 * GET /api/admin/stats/users
 * Returns user metrics for admin dashboard (admin-only).
 */
export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db()

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const usersCol = db.collection('users')
    const projectsCol = db.collection('projects')

    const [totalUsers, newThisWeek, projectsCount, userIdsWithProjects] = await Promise.all([
      usersCol.countDocuments(),
      usersCol.countDocuments({ $or: [{ createdAt: { $gte: oneWeekAgo } }, { emailVerified: { $gte: oneWeekAgo } }] }).catch(() => 0),
      projectsCol.countDocuments(),
      projectsCol.distinct('userId'),
    ])
    const usersWithProjects = userIdsWithProjects.filter(Boolean).length

    const conversionRate =
      totalUsers > 0 ? Math.round((usersWithProjects / totalUsers) * 100) : 0

    return NextResponse.json({
      totalUsers,
      newThisWeek,
      totalProjects: projectsCount,
      usersWithProjects,
      conversionRate,
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
}
