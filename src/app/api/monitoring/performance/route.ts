import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { performanceMonitorService } from '@/lib/services/performanceMonitorService'

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current metrics
    const metrics = performanceMonitorService.getMetrics()
    const alerts = performanceMonitorService.getAlerts()

    return NextResponse.json({
      metrics,
      alerts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    switch (action) {
      case 'start':
        performanceMonitorService.startMonitoring()
        return NextResponse.json({ message: 'Performance monitoring started' })
      
      case 'stop':
        performanceMonitorService.stopMonitoring()
        return NextResponse.json({ message: 'Performance monitoring stopped' })
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error controlling performance monitoring:', error)
    return NextResponse.json(
      { error: 'Failed to control performance monitoring' },
      { status: 500 }
    )
  }
} 