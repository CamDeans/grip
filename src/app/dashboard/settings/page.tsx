'use client'

import { useState, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from '@/components/ui'
import { useTheme } from 'next-themes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { toast } from '@/components/ui/use-toast'
import { GradientTitle } from '@/components/ui/GradientTitle'
import type { UserSettings, UserSettingsUpdate } from '@/lib/services/settingsService'
import { useRouter } from 'next/navigation'
import { 
  ArrowRightOnRectangleIcon, 
  ShieldExclamationIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface ThemeOption {
  value: string
  label: string
  description: string
}

const themeOptions: ThemeOption[] = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow your system theme preferences'
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Light theme for bright environments'
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dark theme for low-light environments'
  }
]

const notificationFrequencyOptions = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Summary' }
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [hasGithubToken, setHasGithubToken] = useState(false)
  const [githubTokenSaving, setGithubTokenSaving] = useState(false)
  const router = useRouter()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (!response.ok) throw new Error('Failed to fetch settings')
        const data = await response.json()
        setSettings(data)
      } catch (error) {
        toast({
          title: 'Failed to load settings',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchSettings()
    }
  }, [session])

  // Fetch user-level settings (GitHub token) from /api/user/settings (API does not return raw token)
  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const res = await fetch('/api/user/settings')
        if (res.ok) {
          const data = await res.json()
          setHasGithubToken(!!data.hasGithubToken)
        }
      } catch {
        // ignore
      }
    }
    if (session?.user) fetchUserSettings()
  }, [session])

  const updateSettings = async (updates: UserSettingsUpdate) => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!response.ok) throw new Error('Failed to update settings')
      const data = await response.json()
      setSettings(data)
      toast({
        title: 'Settings updated successfully',
        description: 'Your settings have been updated successfully'
      })
    } catch (error) {
      toast({
        title: 'Failed to update settings',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const saveGithubToken = async () => {
    setGithubTokenSaving(true)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubToken })
      })
      if (!res.ok) throw new Error('Failed to save token')
      setHasGithubToken(true)
      setGithubToken('')
      toast({
        title: 'GitHub token saved',
        description: 'Your token is used for Export to GitHub from project Preview.'
      })
    } catch (error) {
      toast({
        title: 'Failed to save GitHub token',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      })
    } finally {
      setGithubTokenSaving(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <GradientTitle as="h2">Profile Settings</GradientTitle>
          <CardDescription>
            Manage your profile information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={settings?.profile.name || ''}
                onChange={(e) => updateSettings({
                  profile: { ...settings?.profile, name: e.target.value }
                })}
                className="bg-black text-white border border-input hover:border-accent focus:border-ring focus:ring-ring focus:ring-offset-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                value={settings?.profile.bio || ''}
                onChange={(e) => updateSettings({
                  profile: { ...settings?.profile, bio: e.target.value }
                })}
                className="bg-black text-white border border-input hover:border-accent focus:border-ring focus:ring-ring focus:ring-offset-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <GradientTitle as="h2">Preferences</GradientTitle>
          <CardDescription>
            Customize your application preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings?.preferences.language || 'en'}
                onValueChange={(value: string) => updateSettings({
                  preferences: {
                    ...settings?.preferences,
                    language: value,
                    theme: settings?.preferences.theme || 'system'
                  }
                })}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={settings?.preferences.timezone || 'UTC'}
                onValueChange={(value: string) => updateSettings({
                  preferences: {
                    ...settings?.preferences,
                    timezone: value,
                    theme: settings?.preferences.theme || 'system'
                  }
                })}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <GradientTitle as="h2">Notifications</GradientTitle>
          <CardDescription>
            Configure your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Project Status Updates</Label>
                  <p className="text-sm text-text-secondary">
                    Receive notifications about project status changes
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications.projectStatus}
                  onCheckedChange={(checked) => updateSettings({
                    notifications: { ...settings?.notifications, projectStatus: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Time Tracking Reminders</Label>
                  <p className="text-sm text-text-secondary">
                    Get reminders about time tracking
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications.timeTracking}
                  onCheckedChange={(checked) => updateSettings({
                    notifications: { ...settings?.notifications, timeTracking: checked }
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-text-secondary">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications.emailNotifications}
                  onCheckedChange={(checked) => updateSettings({
                    notifications: { ...settings?.notifications, emailNotifications: checked }
                  })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notification Frequency</Label>
              <Select
                value={settings?.notifications.notificationFrequency || 'realtime'}
                onValueChange={(value: 'realtime' | 'daily' | 'weekly') => updateSettings({
                  notifications: { ...settings?.notifications, notificationFrequency: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {notificationFrequencyOptions.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Quiet Hours</Label>
                  <p className="text-sm text-text-secondary">
                    Disable notifications during specific hours
                  </p>
                </div>
                <Switch
                  checked={settings?.notifications.quietHours.enabled}
                  onCheckedChange={(checked) => updateSettings({
                    notifications: {
                      ...settings?.notifications,
                      quietHours: {
                        ...settings?.notifications.quietHours,
                        enabled: checked
                      }
                    }
                  })}
                />
              </div>
              {settings?.notifications.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={settings?.notifications.quietHours.start}
                      onChange={(e) => updateSettings({
                        notifications: {
                          ...settings?.notifications,
                          quietHours: {
                            ...settings?.notifications.quietHours,
                            start: e.target.value
                          }
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={settings?.notifications.quietHours.end}
                      onChange={(e) => updateSettings({
                        notifications: {
                          ...settings?.notifications,
                          quietHours: {
                            ...settings?.notifications.quietHours,
                            end: e.target.value
                          }
                        }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <GradientTitle as="h2">Account</GradientTitle>
          <CardDescription>
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-medium">Sign out</h4>
                <p className="text-sm text-text-secondary">
                  End your current session
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    toast({
                      title: "Signing out...",
                      description: "Please wait while we sign you out",
                    });
                    await signOut({ redirect: false });
                    toast({
                      title: "Signed out successfully",
                      description: "You have been signed out of your account",
                    });
                    router.push('/login');
                  } catch (error) {
                    console.error('Error signing out:', error);
                    toast({
                      title: "Failed to sign out",
                      description: "Please try again",
                      variant: "destructive",
                    });
                  }
                }}
                icon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <GradientTitle as="h2">Danger Zone</GradientTitle>
          <CardDescription>
            Destructive actions that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-medium">Delete Account Data</h4>
                <p className="text-sm text-text-secondary">
                  Delete all your account data and settings
                </p>
              </div>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  toast({
                    title: "This is a demo feature",
                    description: "In a production environment, this would delete your account data after confirmation.",
                  });
                }}
                icon={<ExclamationTriangleIcon className="h-5 w-5" />}
              >
                Delete Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <GradientTitle as="h2">Appearance</GradientTitle>
          <CardDescription>
            Customize your application theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value)
                  updateSettings({
                    preferences: { ...settings?.preferences, theme: option.value as 'light' | 'dark' | 'system' }
                  })
                }}
                className={`flex flex-col space-y-2 rounded-lg border p-4 text-left transition-colors
                  ${theme === option.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border-default hover:border-border-hover'
                  }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-text-secondary">
                  {option.description}
                </div>
                {theme === option.value && (
                  <div className="text-sm text-primary">
                    Currently active
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <GradientTitle as="h2">Time Tracking</GradientTitle>
          <CardDescription>
            Configure time tracking preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-start Time Tracking</Label>
                <p className="text-sm text-text-secondary">
                  Automatically start time tracking when you open a project
                </p>
              </div>
              <Switch
                checked={settings?.timeTracking.autoStart}
                onCheckedChange={(checked) => updateSettings({
                  timeTracking: { ...settings?.timeTracking, autoStart: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Time Tracking Reminders</Label>
                <p className="text-sm text-text-secondary">
                  Get reminders to track your time
                </p>
              </div>
              <Switch
                checked={settings?.timeTracking.reminders.enabled}
                onCheckedChange={(checked) => updateSettings({
                  timeTracking: {
                    ...settings?.timeTracking,
                    reminders: {
                      ...settings?.timeTracking.reminders,
                      enabled: checked
                    }
                  }
                })}
              />
            </div>
            {settings?.timeTracking.reminders.enabled && (
              <div className="space-y-2">
                <Label>Reminder Interval (minutes)</Label>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={settings?.timeTracking.reminders.interval}
                  onChange={(e) => updateSettings({
                    timeTracking: {
                      ...settings?.timeTracking,
                      reminders: {
                        ...settings?.timeTracking.reminders,
                        interval: parseInt(e.target.value)
                      }
                    }
                  })}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <GradientTitle as="h2">System Integration</GradientTitle>
          <CardDescription>
            Connected services and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <GradientTitle as="h4">GitHub Personal Access Token</GradientTitle>
              <p className="text-sm text-text-secondary mt-1 mb-2">
                One token for <strong>all your projects</strong>. Required for Export to GitHub (project Preview). Create a token with <strong>repo</strong> scope at{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  GitHub Settings → Developer settings → Personal access tokens
                </a>
                .
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label htmlFor="githubToken">Token</Label>
                  <Input
                    id="githubToken"
                    type="password"
                    placeholder={hasGithubToken ? '••••••••••••' : 'ghp_...'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="bg-black text-white border border-input hover:border-accent focus:border-ring focus:ring-ring focus:ring-offset-0 font-mono text-sm"
                    autoComplete="off"
                  />
                  {hasGithubToken && (
                    <p className="text-xs text-success">Token saved. Enter a new token above to replace.</p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={saveGithubToken}
                  disabled={githubTokenSaving || !githubToken.trim()}
                  className="shrink-0"
                >
                  {githubTokenSaving ? 'Saving...' : githubToken.trim() ? 'Save token' : 'Save token'}
                </Button>
              </div>
            </div>
            <div>
              <GradientTitle as="h4">MongoDB Integration</GradientTitle>
              <p className="text-sm text-text-secondary">
                Connected via Environment Configuration
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
