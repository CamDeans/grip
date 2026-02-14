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
  ExclamationTriangleIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  const [vercelToken, setVercelToken] = useState('')
  const [vercelTeamId, setVercelTeamId] = useState('')
  const [hasVercelConnection, setHasVercelConnection] = useState(false)
  const [vercelTokenSaving, setVercelTokenSaving] = useState(false)
  const [mongodbUri, setMongodbUri] = useState('')
  const [hasMongodbConnection, setHasMongodbConnection] = useState(false)
  const [mongodbTestResult, setMongodbTestResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const [mongodbSaving, setMongodbSaving] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionHint, setNewCollectionHint] = useState('')
  const [createCollectionSubmitting, setCreateCollectionSubmitting] = useState(false)
  const router = useRouter()
  const [deleteDataOpen, setDeleteDataOpen] = useState(false)
  const [deleteDataStep, setDeleteDataStep] = useState(1)
  const [deleteDataConfirm, setDeleteDataConfirm] = useState('')
  const [deleteDataSubmitting, setDeleteDataSubmitting] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteAccountStep, setDeleteAccountStep] = useState(1)
  const [deleteAccountEmail, setDeleteAccountEmail] = useState('')
  const [deleteAccountPhrase, setDeleteAccountPhrase] = useState('')
  const [deleteAccountSubmitting, setDeleteAccountSubmitting] = useState(false)

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
          setHasMongodbConnection(!!data.hasMongodbConnection)
          setHasVercelConnection(!!data.hasVercelConnection)
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

  const saveVercelToken = async () => {
    setVercelTokenSaving(true)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vercelToken: vercelToken.trim(), vercelTeamId: vercelTeamId.trim() || undefined }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setHasVercelConnection(true)
      setVercelToken('')
      toast({
        title: 'Vercel connection saved',
        description: 'Your token is used for Deploy to Vercel from project Preview.',
      })
    } catch (error) {
      toast({
        title: 'Failed to save Vercel connection',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setVercelTokenSaving(false)
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
                  <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                  <SelectItem value="America/Chicago">Central (US)</SelectItem>
                  <SelectItem value="America/Denver">Mountain (US)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific (US)</SelectItem>
                  <SelectItem value="America/Phoenix">Arizona</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Europe/Paris">Paris</SelectItem>
                  <SelectItem value="Europe/Berlin">Berlin</SelectItem>
                  <SelectItem value="Europe/Amsterdam">Amsterdam</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                  <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                  <SelectItem value="Asia/Kolkata">India</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                  <SelectItem value="Australia/Melbourne">Melbourne</SelectItem>
                  <SelectItem value="Pacific/Auckland">Auckland</SelectItem>
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
                  <Label>Project & build updates</Label>
                  <p className="text-sm text-text-secondary">
                    Get notified when projects are created and when automated builds succeed or fail (shown in the bell icon).
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
                  <Label>Time tracking reminders</Label>
                  <p className="text-sm text-text-secondary">
                    Remind you to log time when working on projects (if time tracking is enabled).
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
                  <Label>Email notifications</Label>
                  <p className="text-sm text-text-secondary">
                    Send important alerts (e.g. build failures, project updates) to your email when enabled.
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-base font-medium">Delete all data</h4>
                <p className="text-sm text-text-secondary">
                  Permanently delete all your projects, chat history, build logs, and related data. Your account stays; you can continue using GRIP.
                </p>
              </div>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setDeleteDataStep(1)
                  setDeleteDataConfirm('')
                  setDeleteDataOpen(true)
                }}
                icon={<ExclamationTriangleIcon className="h-5 w-5" />}
              >
                Delete Data
              </Button>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-6">
              <div>
                <h4 className="text-base font-medium">Delete account</h4>
                <p className="text-sm text-text-secondary">
                  Permanently delete your account and all data. You will need to sign up again to use GRIP.
                </p>
              </div>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setDeleteAccountStep(1)
                  setDeleteAccountEmail('')
                  setDeleteAccountPhrase('')
                  setDeleteAccountOpen(true)
                }}
                icon={<TrashIcon className="h-5 w-5" />}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDataOpen} onOpenChange={setDeleteDataOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all data</DialogTitle>
          </DialogHeader>
          {deleteDataStep === 1 ? (
            <>
              <p className="text-sm text-text-secondary mb-4">
                This will permanently delete all your projects, chat history, build logs, analyses, and related data. This cannot be undone. Your account will remain so you can continue using GRIP.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setDeleteDataOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => setDeleteDataStep(2)}>Continue</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary mb-2">Type <strong>DELETE</strong> to confirm.</p>
              <Input
                value={deleteDataConfirm}
                onChange={(e) => setDeleteDataConfirm(e.target.value)}
                placeholder="DELETE"
                className="mb-4 font-mono"
                autoComplete="off"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => { setDeleteDataStep(1); setDeleteDataConfirm('') }}>Back</Button>
                <Button
                  variant="destructive"
                  disabled={deleteDataSubmitting || deleteDataConfirm !== 'DELETE'}
                  onClick={async () => {
                    setDeleteDataSubmitting(true)
                    try {
                      const res = await fetch('/api/user/delete-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ confirmPhrase: deleteDataConfirm }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (!res.ok) {
                        toast({ title: 'Failed', description: data.error || 'Could not delete data', variant: 'destructive' })
                        return
                      }
                      toast({ title: 'Data deleted', description: 'All your data has been permanently deleted.' })
                      setDeleteDataOpen(false)
                      setDeleteDataStep(1)
                      setDeleteDataConfirm('')
                      router.refresh()
                    } finally {
                      setDeleteDataSubmitting(false)
                    }
                  }}
                >
                  {deleteDataSubmitting ? 'Deleting…' : 'Delete my data'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
          </DialogHeader>
          {deleteAccountStep === 1 ? (
            <>
              <p className="text-sm text-text-secondary mb-4">
                This will permanently delete your account and all associated data. You will need to sign up again to use GRIP. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setDeleteAccountOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => setDeleteAccountStep(2)}>Continue</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary mb-2">Enter your account email and type <strong>DELETE MY ACCOUNT</strong> to confirm.</p>
              <div className="space-y-2 mb-4">
                <Label>Your email</Label>
                <Input
                  type="email"
                  value={deleteAccountEmail}
                  onChange={(e) => setDeleteAccountEmail(e.target.value)}
                  placeholder={session?.user?.email ?? 'you@example.com'}
                  className="font-mono"
                  autoComplete="email"
                />
                <Label>Type: DELETE MY ACCOUNT</Label>
                <Input
                  value={deleteAccountPhrase}
                  onChange={(e) => setDeleteAccountPhrase(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => { setDeleteAccountStep(1); setDeleteAccountEmail(''); setDeleteAccountPhrase('') }}>Back</Button>
                <Button
                  variant="destructive"
                  disabled={
                    deleteAccountSubmitting ||
                    deleteAccountPhrase !== 'DELETE MY ACCOUNT' ||
                    (deleteAccountEmail.trim().toLowerCase() !== (session?.user?.email ?? '').trim().toLowerCase())
                  }
                  onClick={async () => {
                    setDeleteAccountSubmitting(true)
                    try {
                      const res = await fetch('/api/user/delete-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: deleteAccountEmail.trim(),
                          confirmPhrase: deleteAccountPhrase,
                        }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (!res.ok) {
                        toast({ title: 'Failed', description: data.error || 'Could not delete account', variant: 'destructive' })
                        return
                      }
                      toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' })
                      setDeleteAccountOpen(false)
                      setDeleteAccountStep(1)
                      setDeleteAccountEmail('')
                      setDeleteAccountPhrase('')
                      await signOut({ redirect: false })
                      router.push('/login')
                    } finally {
                      setDeleteAccountSubmitting(false)
                    }
                  }}
                >
                  {deleteAccountSubmitting ? 'Deleting…' : 'Delete my account'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
              <GradientTitle as="h4">Vercel (Deploy)</GradientTitle>
              <p className="text-sm text-text-secondary mt-1 mb-2">
                One token for <strong>all your projects</strong>. Required for Deploy to Vercel from project Preview. Create a token at{' '}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  vercel.com/account/tokens
                </a>
                . If you use a team, paste your <strong>Team ID</strong> below (Vercel → Team Settings → General).
              </p>
              <div className="flex flex-wrap items-end gap-2 space-y-2">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label htmlFor="vercelToken">Token</Label>
                  <Input
                    id="vercelToken"
                    type="password"
                    placeholder={hasVercelConnection ? '••••••••••••' : 'vercel_...'}
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    className="bg-black text-white border border-input hover:border-accent focus:ring-ring focus:ring-offset-0 font-mono text-sm"
                    autoComplete="off"
                  />
                  {hasVercelConnection && (
                    <p className="text-xs text-success">Token saved. Enter a new token above to replace.</p>
                  )}
                </div>
                <div className="w-full sm:w-auto min-w-[140px] space-y-2">
                  <Label htmlFor="vercelTeamId">Team ID (optional)</Label>
                  <Input
                    id="vercelTeamId"
                    type="text"
                    placeholder="team_..."
                    value={vercelTeamId}
                    onChange={(e) => setVercelTeamId(e.target.value)}
                    className="bg-black text-white border border-input hover:border-accent focus:ring-ring focus:ring-offset-0 font-mono text-sm"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  onClick={saveVercelToken}
                  disabled={vercelTokenSaving || !vercelToken.trim()}
                  className="shrink-0"
                >
                  {vercelTokenSaving ? 'Saving...' : 'Save Vercel connection'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <GradientTitle as="h2">Backend connections</GradientTitle>
          <CardDescription>
            Connect your own database for fullstack builds. When you build in Develop, GRIP uses this so it can suggest MongoDB and MONGODB_URI. Create collections below with minimal input—no dev experience required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <GradientTitle as="h4">MongoDB</GradientTitle>
              <p className="text-sm text-text-secondary mt-1 mb-3">
                One connection for <strong>all your projects</strong>. Used for fullstack builds and for creating collections below. Get a free database and connection string from MongoDB Atlas:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary mb-4 pl-1">
                <li>
                  Create a free account and cluster at{' '}
                  <a
                    href="https://www.mongodb.com/cloud/atlas/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    MongoDB Atlas → Sign up
                  </a>
                  .
                </li>
                <li>
                  In Atlas, open your cluster and click <strong>Connect</strong> → <strong>Connect your application</strong> → copy the connection string (it starts with <code className="text-xs bg-muted px-1 rounded">mongodb+srv://</code>).
                </li>
                <li>
                  Replace <code className="text-xs bg-muted px-1 rounded">&lt;password&gt;</code> in the string with your database user password. Need help? See{' '}
                  <a
                    href="https://www.mongodb.com/docs/atlas/getting-started/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Atlas Getting Started
                  </a>
                  .
                </li>
                <li>
                  Paste the connection string below, click <strong>Test</strong>, then <strong>Save connection</strong>.
                </li>
              </ol>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px] space-y-2">
                  <Label htmlFor="mongodbUri">Connection string</Label>
                  <Input
                    id="mongodbUri"
                    type="password"
                    placeholder={hasMongodbConnection ? '••••••••••••' : 'mongodb+srv://... or mongodb://...'}
                    value={mongodbUri}
                    onChange={(e) => { setMongodbUri(e.target.value); setMongodbTestResult(null) }}
                    className="bg-black text-white border border-input hover:border-accent focus:border-ring focus:ring-ring focus:ring-offset-0 font-mono text-sm"
                    autoComplete="off"
                  />
                  {hasMongodbConnection && (
                    <p className="text-xs text-success">Connection saved. Enter a new URI above to replace.</p>
                  )}
                  {mongodbTestResult && (
                    <p className={`text-xs ${mongodbTestResult.ok ? 'text-success' : 'text-destructive'}`}>
                      {mongodbTestResult.ok ? mongodbTestResult.message ?? 'Connection successful' : mongodbTestResult.message ?? 'Connection failed'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {hasMongodbConnection && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          setMongodbTestResult(null)
                          try {
                            const res = await fetch('/api/user/backend-connections/test-saved')
                            const data = await res.json()
                            setMongodbTestResult({ ok: data.ok, message: data.ok ? data.message : data.error })
                          } catch {
                            setMongodbTestResult({ ok: false, message: 'Request failed' })
                          }
                        }}
                      >
                        Test saved
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/user/settings', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ mongodbUri: '' }),
                            })
                            if (!res.ok) throw new Error('Failed to remove')
                            setHasMongodbConnection(false)
                            setMongodbTestResult(null)
                            toast({ title: 'Connection removed', description: 'You can add a new connection anytime.' })
                          } catch {
                            toast({ title: 'Failed to remove connection', variant: 'destructive' })
                          }
                        }}
                      >
                        Remove connection
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const uri = mongodbUri.trim()
                      if (!uri) {
                        toast({ title: 'Enter a connection string to test', variant: 'destructive' })
                        return
                      }
                      try {
                        const res = await fetch('/api/user/backend-connections/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mongodbUri: uri }),
                        })
                        const data = await res.json()
                        setMongodbTestResult({ ok: data.ok, message: data.message ?? data.error })
                      } catch {
                        setMongodbTestResult({ ok: false, message: 'Request failed' })
                      }
                    }}
                  >
                    Test
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!mongodbUri.trim()) {
                        toast({ title: 'Enter a connection string', variant: 'destructive' })
                        return
                      }
                      setMongodbSaving(true)
                      try {
                        const res = await fetch('/api/user/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mongodbUri: mongodbUri.trim() }),
                        })
                        if (!res.ok) throw new Error('Failed to save')
                        setHasMongodbConnection(true)
                        setMongodbUri('')
                        setMongodbTestResult(null)
                        toast({ title: 'MongoDB connection saved', description: 'Use "Create collection" below to add collections.' })
                      } catch {
                        toast({ title: 'Failed to save connection', variant: 'destructive' })
                      } finally {
                        setMongodbSaving(false)
                      }
                    }}
                    disabled={mongodbSaving || !mongodbUri.trim()}
                  >
                    {mongodbSaving ? 'Saving...' : 'Save connection'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-6">
              <GradientTitle as="h4">Create a collection</GradientTitle>
              <p className="text-sm text-text-secondary mt-1 mb-2">
                After saving a connection above, you can create collections here. GRIP will add them to your database—no code required.
              </p>
              <p className="text-sm text-text-secondary mb-3">
                Enter a name (e.g. <strong>users</strong>, <strong>posts</strong>, <strong>tasks</strong>). Optionally describe what the collection stores; GRIP can use that when building your app in Develop.
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-2 min-w-[140px]">
                  <Label>Collection name</Label>
                  <Input
                    placeholder="e.g. users"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value.replace(/\s/g, '_'))}
                    className="font-mono"
                  />
                </div>
                <div className="flex-1 min-w-[180px] space-y-2">
                  <Label>What it stores (optional)</Label>
                  <Input
                    placeholder="e.g. user profiles and preferences"
                    value={newCollectionHint}
                    onChange={(e) => setNewCollectionHint(e.target.value)}
                  />
                </div>
                <Button
                  disabled={!hasMongodbConnection || !newCollectionName.trim() || createCollectionSubmitting}
                  onClick={async () => {
                    setCreateCollectionSubmitting(true)
                    try {
                      const res = await fetch('/api/user/backend-connections/mongodb/collections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ collectionName: newCollectionName.trim(), schemaHint: newCollectionHint.trim() || undefined }),
                      })
                      const data = await res.json()
                      if (!res.ok) {
                        toast({ title: 'Failed', description: data.error ?? 'Could not create collection', variant: 'destructive' })
                        return
                      }
                      toast({ title: 'Collection created', description: data.message ?? `"${newCollectionName}" is ready.` })
                      setNewCollectionName('')
                      setNewCollectionHint('')
                    } finally {
                      setCreateCollectionSubmitting(false)
                    }
                  }}
                >
                  {createCollectionSubmitting ? 'Creating…' : 'Create collection'}
                </Button>
              </div>
              {!hasMongodbConnection && (
                <p className="text-xs text-text-secondary mt-2">Save a MongoDB connection above first, then you can create collections here.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
