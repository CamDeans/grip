import { UserSettings } from '@/lib/models/UserSettings'
import { dbConnect } from '@/lib/db'

export interface UserSettings {
  userId: string
  profile: {
    name: string
    email: string
    avatar?: string
    bio?: string
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    dateFormat: string
  }
  notifications: {
    projectStatus: boolean
    timeTracking: boolean
    reminders: boolean
    emailNotifications: boolean
    pushNotifications: boolean
    notificationFrequency: 'realtime' | 'daily' | 'weekly'
    quietHours: {
      enabled: boolean
      start: string
      end: string
    }
  }
  timeTracking: {
    autoStart: boolean
    reminders: {
      enabled: boolean
      interval: number // in minutes
    }
  }
}

export type UserSettingsUpdate = {
  userId?: string
  profile?: {
    name?: string
    email?: string
    avatar?: string
    bio?: string
  }
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    timezone?: string
    dateFormat?: string
  }
  notifications?: {
    projectStatus?: boolean
    timeTracking?: boolean
    reminders?: boolean
    emailNotifications?: boolean
    pushNotifications?: boolean
    notificationFrequency?: 'realtime' | 'daily' | 'weekly'
    quietHours?: {
      enabled?: boolean
      start?: string
      end?: string
    }
  }
  timeTracking?: {
    autoStart?: boolean
    reminders?: {
      enabled?: boolean
      interval?: number
    }
  }
}

export const defaultSettings: UserSettings = {
  userId: '',
  profile: {
    name: '',
    email: '',
    avatar: '',
    bio: ''
  },
  preferences: {
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY'
  },
  notifications: {
    projectStatus: true,
    timeTracking: true,
    reminders: true,
    emailNotifications: true,
    pushNotifications: true,
    notificationFrequency: 'realtime',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00'
    }
  },
  timeTracking: {
    autoStart: false,
    reminders: {
      enabled: true,
      interval: 30
    }
  }
}

export const settingsService = {
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    await dbConnect()
    const settings = await UserSettings.findOne({ userId })
    if (!settings) return null
    return settings.toObject() as UserSettings
  },

  async updateUserSettings(userId: string, updates: UserSettingsUpdate): Promise<UserSettings> {
    await dbConnect()
    const currentSettings = await this.getUserSettings(userId) || {
      ...defaultSettings,
      userId,
      profile: {
        ...defaultSettings.profile,
        email: userId
      }
    }

    const mergedSettings = {
      ...currentSettings,
      ...updates,
      profile: {
        ...currentSettings.profile,
        ...updates.profile,
        email: updates.profile?.email || currentSettings.profile.email
      },
      preferences: {
        ...currentSettings.preferences,
        ...updates.preferences,
        theme: updates.preferences?.theme || currentSettings.preferences.theme,
        language: updates.preferences?.language || currentSettings.preferences.language,
        timezone: updates.preferences?.timezone || currentSettings.preferences.timezone,
        dateFormat: updates.preferences?.dateFormat || currentSettings.preferences.dateFormat
      },
      notifications: {
        ...currentSettings.notifications,
        ...updates.notifications,
        projectStatus: updates.notifications?.projectStatus ?? currentSettings.notifications.projectStatus,
        timeTracking: updates.notifications?.timeTracking ?? currentSettings.notifications.timeTracking,
        reminders: updates.notifications?.reminders ?? currentSettings.notifications.reminders,
        emailNotifications: updates.notifications?.emailNotifications ?? currentSettings.notifications.emailNotifications,
        pushNotifications: updates.notifications?.pushNotifications ?? currentSettings.notifications.pushNotifications,
        notificationFrequency: updates.notifications?.notificationFrequency || currentSettings.notifications.notificationFrequency,
        quietHours: {
          ...currentSettings.notifications.quietHours,
          ...updates.notifications?.quietHours,
          enabled: updates.notifications?.quietHours?.enabled ?? currentSettings.notifications.quietHours.enabled,
          start: updates.notifications?.quietHours?.start || currentSettings.notifications.quietHours.start,
          end: updates.notifications?.quietHours?.end || currentSettings.notifications.quietHours.end
        }
      },
      timeTracking: {
        ...currentSettings.timeTracking,
        ...updates.timeTracking,
        autoStart: updates.timeTracking?.autoStart ?? currentSettings.timeTracking.autoStart,
        reminders: {
          ...currentSettings.timeTracking.reminders,
          ...updates.timeTracking?.reminders,
          enabled: updates.timeTracking?.reminders?.enabled ?? currentSettings.timeTracking.reminders.enabled,
          interval: updates.timeTracking?.reminders?.interval || currentSettings.timeTracking.reminders.interval
        }
      }
    }

    const result = await UserSettings.findOneAndUpdate(
      { userId },
      mergedSettings,
      { new: true, upsert: true }
    )

    if (!result) {
      throw new Error('Failed to update settings')
    }

    return result.toObject() as UserSettings
  },

  async updateProfile(userId: string, profile: Partial<UserSettings['profile']>): Promise<UserSettings> {
    return this.updateUserSettings(userId, { profile })
  },

  async updatePreferences(userId: string, preferences: Partial<UserSettings['preferences']>): Promise<UserSettings> {
    return this.updateUserSettings(userId, { preferences })
  },

  async updateNotifications(userId: string, notifications: Partial<UserSettings['notifications']>): Promise<UserSettings> {
    return this.updateUserSettings(userId, { notifications })
  },

  async updateTimeTracking(userId: string, timeTracking: Partial<UserSettings['timeTracking']>): Promise<UserSettings> {
    return this.updateUserSettings(userId, { timeTracking })
  }
} 