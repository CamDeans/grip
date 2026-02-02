import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { TerminalSession } from '@/lib/models'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to MongoDB
    await connectToDatabase()
    
    // Aggregate terminal statistics
    const terminalStats = await TerminalSession.aggregate([
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
      active: 0,
      inactive: 0,
      error: 0
    }
    
    // Process aggregation results
    terminalStats.forEach((stat: any) => {
      stats.total += stat.count
      
      if (stat._id === 'active') {
        stats.active = stat.count
      } else if (stat._id === 'inactive') {
        stats.inactive = stat.count
      } else if (stat._id === 'error') {
        stats.error = stat.count
      }
    })
    
    // If we don't have real data yet, provide mock data for dev purposes
    if (stats.total === 0) {
      return NextResponse.json({
        total: 5,
        active: 2,
        inactive: 3,
        error: 0
      })
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching terminal stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terminal statistics' },
      { status: 500 }
    )
  }
} 