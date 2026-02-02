import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { connectToDatabase } from '@/lib/mongodb'
import { pauseSystem, getSystemState } from '@/lib/services/systemControlService'

// Helper function to check if user is an admin
function isAdminUser(session: any): boolean {
  return session?.user?.role === 'admin' || 
         (session?.user?.roles && session.user.roles.includes('admin')) ||
         session?.user?.isAdmin === true;
}

/**
 * POST /api/admin/system-state/pause
 * Pause the automation system
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if user has admin role
    if (!isAdminUser(session)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }
    
    await connectToDatabase()
    
    // Pause the system
    const paused = await pauseSystem()
    
    if (!paused) {
      return NextResponse.json(
        { error: 'Failed to pause system or system already paused' },
        { status: 400 }
      )
    }
    
    // Get updated system state
    const state = await getSystemState()
    
    return NextResponse.json({ 
      success: true,
      message: 'System paused successfully',
      state
    })
  } catch (error) {
    console.error('Error in POST /api/admin/system-state/pause:', error)
    return NextResponse.json(
      { error: 'Failed to pause system', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 