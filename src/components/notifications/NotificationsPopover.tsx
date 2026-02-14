import { useState, useEffect } from 'react'
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { toast } from '@/components/ui/use-toast'
import { formatDateInTimezone } from '@/lib/utils/dateUtils'
import { useUserTimezone } from '@/hooks/useUserTimezone'

interface Notification {
  id: string
  type: 'project_update' | 'build_success' | 'build_failure' | 'security_alert' | 'reminder' | 'system'
  title: string
  message: string
  timestamp: string
  projectId?: string
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
}

export function NotificationsPopover() {
  const { data: session } = useSession()
  const timezone = useUserTimezone()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Only fetch if the popover is open or we need to count unread
    const fetchNotifications = async () => {
      if (!session?.user) return
      
      try {
        setIsLoading(true)
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          // Sort notifications by priority and date
          const sortedData = data.sort((a: Notification, b: Notification) => {
            // First sort by read status
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
            
            // Then by priority
            const priorityWeight = { high: 3, medium: 2, low: 1 }
            const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority]
            if (priorityDiff !== 0) return priorityDiff
            
            // Finally by date (newest first)
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          })
          
          setNotifications(sortedData)
          setUnreadCount(sortedData.filter((n: Notification) => !n.isRead).length)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
    
    // Set up polling for new notifications every 5 minutes
    const interval = setInterval(fetchNotifications, 300000)
    return () => clearInterval(interval)
  }, [session, isOpen])

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      })
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
        toast({
          title: "Notifications cleared",
          description: "All notifications marked as read",
        })
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive"
      })
    }
  }

  const getPriorityStyles = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-900/40 dark:text-yellow-400'
      default:
        return 'bg-primary/10 text-primary border-primary/20'
    }
  }

  const getNotificationTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'build_success': return 'Build Success'
      case 'build_failure': return 'Build Failed'
      case 'security_alert': return 'Security Alert'
      case 'project_update': return 'Project Update'
      case 'reminder': return 'Reminder'
      default: return 'System'
    }
  }

  // Filter out low-priority notifications after a certain threshold
  // to prevent notification overload
  const priorityFilteredNotifications = notifications.filter((notification, index) => {
    if (notification.priority !== 'low') return true
    // Keep a maximum of 5 low priority notifications
    const lowPriorityCount = notifications.slice(0, index)
      .filter(n => n.priority === 'low').length
    return lowPriorityCount < 5
  })

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        title="View notifications"
        className="bg-background-primary"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-background-primary" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 rounded-lg bg-background-primary border border-border shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-semibold text-text-primary">Notifications</h2>
            <div className="flex space-x-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  aria-label="Mark all as read"
                  title="Mark all as read"
                  className="text-xs bg-background-primary"
                >
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                title="Close notifications"
                className="bg-background-primary"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-text-secondary">
                Loading notifications...
              </div>
            ) : priorityFilteredNotifications.length > 0 ? (
              <div className="divide-y divide-border">
                {priorityFilteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors duration-200 hover:bg-background-hover ${
                      !notification.isRead ? 'bg-background-secondary/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityStyles(
                              notification.priority
                            )}`}
                          >
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {formatDateInTimezone(notification.timestamp, timezone)}
                          </span>
                        </div>
                        <h3 className="mt-1 text-sm font-medium text-text-primary">
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          {notification.message}
                        </p>
                        {notification.projectId && (
                          <Link
                            href={`/dashboard/projects/${notification.projectId}`}
                            className="mt-2 inline-flex items-center text-xs text-primary hover:text-primary-hover"
                          >
                            View Project
                          </Link>
                        )}
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-4 text-xs px-2 py-1 rounded bg-background-primary text-text-secondary hover:text-primary"
                          title="Mark notification as read"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-text-secondary">
                <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
                <p className="text-xs mt-1">
                  You&apos;ll receive important alerts about your projects here
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 
