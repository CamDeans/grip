import mongoose, { Schema, Document } from 'mongoose'
import { dbConnect } from '@/lib/db'

export interface UserSettingsDocument extends Document {
  userId: string;
  profile: {
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    dateFormat: string;
  };
  notifications: {
    projectStatus: boolean;
    timeTracking: boolean;
    reminders: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    notificationFrequency: 'realtime' | 'daily' | 'weekly';
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  timeTracking: {
    autoStart: boolean;
    reminders: {
      enabled: boolean;
      interval: number;
    };
  };
}

const UserSettingsSchema = new Schema<UserSettingsDocument>(
  {
    userId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    profile: {
      name: { type: String, default: '' },
      email: { type: String, required: true },
      avatar: { type: String },
      bio: { type: String }
    },
    preferences: {
      theme: { 
        type: String, 
        enum: ['light', 'dark', 'system'], 
        default: 'system' 
      },
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' }
    },
    notifications: {
      projectStatus: { type: Boolean, default: true },
      timeTracking: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      notificationFrequency: { 
        type: String, 
        enum: ['realtime', 'daily', 'weekly'], 
        default: 'realtime' 
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: '22:00' },
        end: { type: String, default: '07:00' }
      }
    },
    timeTracking: {
      autoStart: { type: Boolean, default: false },
      reminders: {
        enabled: { type: Boolean, default: true },
        interval: { type: Number, default: 30 }
      }
    }
  },
  { 
    timestamps: true,
    methods: {
      toJSON() {
        return {
          userId: this.userId,
          profile: this.profile,
          preferences: this.preferences,
          notifications: this.notifications,
          timeTracking: this.timeTracking
        };
      }
    }
  }
);

// Get the UserSettings model, creating it if it doesn't exist
export const UserSettings = mongoose.models.UserSettings as mongoose.Model<UserSettingsDocument> || 
  mongoose.model<UserSettingsDocument>('UserSettings', UserSettingsSchema);

// Connect to the database
dbConnect().catch(err => {
  console.error('Failed to connect to database:', err);
}); 