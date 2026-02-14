/**
 * Server-side helper to create user notifications.
 * Respects user settings (project status, quiet hours) and inserts into the notifications collection.
 * Use this from API routes (e.g. after build, project created) so users see real notifications.
 */

import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export type NotificationType =
  | 'project_update'
  | 'build_success'
  | 'build_failure'
  | 'security_alert'
  | 'reminder'
  | 'system'

export type NotificationPriority = 'low' | 'medium' | 'high'

export interface CreateNotificationParams {
  /** User ID (email) — must match GET /api/notifications which uses session.user.email */
  userId: string
  type: NotificationType
  title: string
  message: string
  projectId?: string
  priority?: NotificationPriority
}

function isInQuietHours(quietHours: { enabled: boolean; start: string; end: string }): boolean {
  if (!quietHours?.enabled) return false
  const now = new Date()
  const currentHour = now.getHours()
  const startHour = parseInt(quietHours.start.split(':')[0], 10)
  const endHour = parseInt(quietHours.end.split(':')[0], 10)
  if (startHour <= endHour) {
    return currentHour >= startHour && currentHour < endHour
  }
  return currentHour >= startHour || currentHour < endHour
}

/**
 * Create a notification for a user. Skips if user has disabled this type or is in quiet hours.
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  const { userId, type, title, message, projectId, priority = 'low' } = params
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')

    const userSettings = await db.collection('userSettings').findOne({ userId }) as {
      notifications?: {
        projectStatus?: boolean
        reminders?: boolean
        quietHours?: { enabled: boolean; start: string; end: string }
      }
    } | null

    if (userSettings?.notifications?.quietHours && isInQuietHours(userSettings.notifications.quietHours)) {
      return false
    }
    if (type === 'project_update' && userSettings?.notifications?.projectStatus === false) {
      return false
    }
    if (type === 'reminder' && userSettings?.notifications?.reminders === false) {
      return false
    }

    const doc = {
      userId,
      type,
      title,
      message,
      projectId: projectId ?? undefined,
      priority,
      timestamp: new Date(),
      isRead: false,
    }
    await db.collection('notifications').insertOne(doc)
    return true
  } catch (err) {
    console.error('createNotification error:', err)
    return false
  }
}
