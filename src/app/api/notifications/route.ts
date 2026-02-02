import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { Notification } from '@/lib/models/Notification'
import { UserSettings } from '@/lib/models/UserSettings'
import clientPromise from '@/lib/db'

// GET - Retrieve user's notifications
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()
    
    // Get authenticated user
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.email
    
    // Get user settings to check notification preferences
    const userSettings = await db.collection('userSettings').findOne({ userId })
    
    // Default to showing all notifications if settings don't exist
    const showNotifications = !userSettings || userSettings.notifications.projectStatus
    
    if (!showNotifications) {
      // Return empty array if user has disabled notifications
      return NextResponse.json([])
    }
    
    // Get notifications for the user
    // Limit to last 30 days and 50 notifications max to prevent overloading
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const notifications = await db.collection('notifications')
      .find({ 
        userId,
        timestamp: { $gte: thirtyDaysAgo }
      })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray()
    
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error retrieving notifications:', error)
    return NextResponse.json({ message: 'Failed to retrieve notifications' }, { status: 500 })
  }
}

// POST - Create a new notification (internal use only)
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()
    
    // This endpoint should be protected and only accessible internally
    // In production, use API keys or other authentication methods
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    
    const data = await request.json()
    
    // Validate required fields
    if (!data.userId || !data.title || !data.message || !data.type) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }
    
    // Check if the user has disabled this type of notification
    const userSettings = await db.collection('userSettings').findOne({ userId: data.userId })
    
    // Filter notifications based on user preferences
    let shouldSend = true
    if (userSettings) {
      if (data.type === 'project_update' && !userSettings.notifications.projectStatus) {
        shouldSend = false
      }
      else if (data.type === 'reminder' && !userSettings.notifications.reminders) {
        shouldSend = false
      }
      // Apply quiet hours if enabled
      if (userSettings.notifications.quietHours?.enabled) {
        const now = new Date()
        const currentHour = now.getHours()
        const startHour = parseInt(userSettings.notifications.quietHours.start.split(':')[0], 10)
        const endHour = parseInt(userSettings.notifications.quietHours.end.split(':')[0], 10)
        
        // Check if current time is within quiet hours
        if (startHour <= endHour) {
          // Normal range (e.g., 22:00 to 07:00)
          if (currentHour >= startHour && currentHour < endHour) {
            shouldSend = false
          }
        } else {
          // Overnight range (e.g., 22:00 to 07:00)
          if (currentHour >= startHour || currentHour < endHour) {
            shouldSend = false
          }
        }
      }
    }
    
    // Don't create notification if user preferences prevent it
    if (!shouldSend) {
      return NextResponse.json({ message: 'Notification suppressed due to user preferences' })
    }
    
    // Create the notification
    const newNotification = {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      projectId: data.projectId,
      priority: data.priority || 'low',
      timestamp: new Date(),
      isRead: false
    }
    
    const result = await db.collection('notifications').insertOne(newNotification)
    
    return NextResponse.json({ 
      message: 'Notification created', 
      notificationId: result.insertedId,
      notification: newNotification 
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ message: 'Failed to create notification' }, { status: 500 })
  }
}

// Update notification (mark as read)
export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json()
    console.log('Updating notification:', data);

    const notification = await Notification.findByIdAndUpdate(
      data.id,
      { $set: { read: true } },
      { new: true }
    )

    if (!notification) {
      console.log('Notification not found:', data.id);
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    console.log('Updated notification:', notification);
    return NextResponse.json(notification)
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

// Delete notification
export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    console.log('Deleting notification:', id);

    const notification = await Notification.findByIdAndDelete(id)

    if (!notification) {
      console.log('Notification not found:', id);
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    console.log('Deleted notification:', id);
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
} 
