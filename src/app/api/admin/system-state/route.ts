import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { connectToDatabase } from '@/lib/mongodb'
import { 
  getSystemState, 
  updateSystemState
} from '@/lib/services/systemControlService'

// Helper function to check if user is an admin
function isAdminUser(session: any): boolean {
  return session?.user?.role === 'admin' || 
         (session?.user?.roles && session.user.roles.includes('admin')) ||
         session?.user?.isAdmin === true;
}

/**
 * GET /api/admin/system-state
 * Get the current automation system state
 */
export async function GET(_req: NextRequest) {
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
    
    // Get current system state
    const state = await getSystemState()
    
    return NextResponse.json({ state })
  } catch (error) {
    console.error('Error in GET /api/admin/system-state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system state', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/system-state
 * Update the automation system state
 */
export async function PUT(req: NextRequest) {
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
    
    // Get request body
    const body = await req.json()
    
    // Validate request body
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No settings provided for update' },
        { status: 400 }
      )
    }
    
    await connectToDatabase()
    
    // Update system state
    const updated = await updateSystemState(body)
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update system state' },
        { status: 500 }
      )
    }
    
    // Get updated system state
    const state = await getSystemState()
    
    return NextResponse.json({ 
      success: true,
      message: 'System state updated successfully',
      state
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/system-state:', error)
    return NextResponse.json(
      { error: 'Failed to update system state', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 