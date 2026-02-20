import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    // Connect to database (same db as GET /api/notifications and createNotification)
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    
    // Get authenticated user
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = session.user.email
    
    // Mark all unread notifications as read
    const result = await db.collection('notifications').updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    )
    
    return NextResponse.json({
      message: 'All notifications marked as read',
      count: result.modifiedCount
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { message: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
} 