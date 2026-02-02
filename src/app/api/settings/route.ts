import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { settingsService, defaultSettings, type UserSettingsUpdate } from '@/lib/services/settingsService'

// Get user settings
export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.email
    let settings = await settingsService.getUserSettings(userId)
    
    // If no settings exist yet, return default settings
    if (!settings) {
      settings = {
        ...defaultSettings,
        userId,
        profile: {
          ...defaultSettings.profile,
          name: session.user.name || '',
          email: session.user.email
        }
      }
    }
    
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = session.user.email
    const updates: UserSettingsUpdate = await request.json()
    
    // Validate the settings
    if (!updates) {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      )
    }
    
    // Update settings
    const updatedSettings = await settingsService.updateUserSettings(userId, updates)
    
    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
} 