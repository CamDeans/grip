import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = session.user.email
    let oid: ObjectId
    try {
      oid = new ObjectId(notificationId)
    } catch {
      return NextResponse.json({ message: 'Invalid notification ID' }, { status: 400 })
    }
    
    const notification = await db.collection('notifications').findOne({
      _id: oid,
      userId
    })
    
    if (!notification) {
      return NextResponse.json(
        { message: 'Notification not found' },
        { status: 404 }
      )
    }
    
    await db.collection('notifications').updateOne(
      { _id: oid },
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