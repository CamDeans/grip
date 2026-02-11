import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'

/**
 * GET /api/admin/stats/users
 * Returns user metrics for admin dashboard (admin-only).
 * ?list=1 returns also a list of users (id, email, name, createdAt).
 */
export async function GET(request: Request) {
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
    const url = new URL(request.url)
    const withList = url.searchParams.get('list') === '1'

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const usersCol = db.collection('users')
    const projectsCol = db.collection('projects')

    const [totalUsers, newThisWeek, projectsCount, userIdsWithProjects, userList] = await Promise.all([
      usersCol.countDocuments(),
      usersCol.countDocuments({ $or: [{ createdAt: { $gte: oneWeekAgo } }, { emailVerified: { $gte: oneWeekAgo } }] }).catch(() => 0),
      projectsCol.countDocuments(),
      projectsCol.distinct('userId'),
      withList ? usersCol.find({}).sort({ createdAt: -1 }).limit(200).project({ _id: 1, email: 1, name: 1, createdAt: 1 }).toArray() : Promise.resolve([]),
    ])
    const usersWithProjects = userIdsWithProjects.filter(Boolean).length

    const conversionRate =
      totalUsers > 0 ? Math.round((usersWithProjects / totalUsers) * 100) : 0

    const payload: Record<string, unknown> = {
      totalUsers,
      newThisWeek,
      totalProjects: projectsCount,
      usersWithProjects,
      conversionRate,
    }
    if (withList) (payload as { users: unknown[] }).users = userList.map((u: { _id: unknown; email?: string; name?: string; createdAt?: Date }) => ({
      _id: String(u._id),
      email: u.email,
      name: u.name,
      createdAt: u.createdAt?.toISOString?.(),
    }))
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
}
