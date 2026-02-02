import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { Notification } from '@/lib/models/Notification'
import clientPromise from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to database
    const client = await clientPromise
    const db = client.db()
    
    // Get authenticated user
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = session.user.email
    const notificationId = params.id
    
    // Validate the notification exists and belongs to the user
    const notification = await db.collection('notifications').findOne({
      _id: notificationId,
      userId
    })
    
    if (!notification) {
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      )
    }
    
    // Update the notification to mark it as read
    await db.collection('notifications').updateOne(
      { _id: notificationId },
      { $set: { isRead: true } }
    )
    
    return NextResponse.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { message: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
} 