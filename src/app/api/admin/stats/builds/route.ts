import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { BuildLog } from '@/lib/models'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to MongoDB
    await connectToDatabase()
    
    // Aggregate build statistics
    const buildStats = await BuildLog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
    
    // Format the response
    const stats = {
      total: 0,
      running: 0,
      completed: 0,
      failed: 0,
      pending: 0,
      cancelled: 0
    }
    
    // Process aggregation results
    buildStats.forEach((stat: any) => {
      stats.total += stat.count
      
      if (stat._id === 'completed') {
        stats.completed = stat.count
      } else if (stat._id === 'failed') {
        stats.failed = stat.count
      } else if (stat._id === 'running') {
        stats.running = stat.count
      } else if (stat._id === 'pending') {
        stats.pending = stat.count
      } else if (stat._id === 'cancelled') {
        stats.cancelled = stat.count
      }
    })
    
    // If we don't have real data yet, provide mock data for dev purposes
    if (stats.total === 0) {
      return NextResponse.json({
        total: 12,
        running: 2,
        completed: 8,
        failed: 1,
        pending: 1,
        cancelled: 0
      })
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching build stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch build statistics' },
      { status: 500 }
    )
  }
} 