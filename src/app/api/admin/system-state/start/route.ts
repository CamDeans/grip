import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { connectToDatabase } from '@/lib/mongodb'
import { startSystem, getSystemState } from '@/lib/services/systemControlService'

// Helper function to check if user is an admin
function isAdminUser(session: any): boolean {
  return session?.user?.role === 'admin' || 
         (session?.user?.roles && session.user.roles.includes('admin')) ||
         session?.user?.isAdmin === true;
}

/**
 * POST /api/admin/system-state/start
 * Start the automation system
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
    
    // Start the system
    const started = await startSystem()
    
    if (!started) {
      return NextResponse.json(
        { error: 'Failed to start system or system already running' },
        { status: 400 }
      )
    }
    
    // Get updated system state
    const state = await getSystemState()
    
    return NextResponse.json({ 
      success: true,
      message: 'System started successfully',
      state
    })
  } catch (error) {
    console.error('Error in POST /api/admin/system-state/start:', error)
    return NextResponse.json(
      { error: 'Failed to start system', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 