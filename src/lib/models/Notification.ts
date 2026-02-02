import mongoose, { Document, Schema } from 'mongoose'

// Define notification types for better type checking
export type NotificationType = 
  | 'project_update' 
  | 'build_success' 
  | 'build_failure' 
  | 'security_alert' 
  | 'reminder' 
  | 'system'

// Define priority levels for notifications
export type NotificationPriority = 'low' | 'medium' | 'high'

// Notification interface
export interface NotificationDocument extends Document {
  userId: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  projectId?: string
  isRead: boolean
  priority: NotificationPriority
}

// Notification Schema
const NotificationSchema = new Schema<NotificationDocument>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['project_update', 'build_success', 'build_failure', 'security_alert', 'reminder', 'system'],
    default: 'system'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  projectId: {
    type: String,
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  }
}, { 
  timestamps: true, 
  // Add auto-expiration after 90 days to keep the collection size manageable
  // This uses MongoDB's TTL index feature
  expires: 60 * 60 * 24 * 90 
})

// Create indexes to improve query performance
NotificationSchema.index({ userId: 1, isRead: 1 })
NotificationSchema.index({ timestamp: -1 })
NotificationSchema.index({ userId: 1, type: 1 })

// Create a TTL index for automatic cleanup of old notifications
NotificationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 })

// Helper methods
NotificationSchema.statics.countUnread = async function(userId: string) {
  return this.countDocuments({ userId, isRead: false })
}

NotificationSchema.statics.markAllAsRead = async function(userId: string) {
  return this.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  )
}

// Create the model
export const Notification = mongoose.models.Notification as mongoose.Model<NotificationDocument> || 
  mongoose.model<NotificationDocument>('Notification', NotificationSchema) 
