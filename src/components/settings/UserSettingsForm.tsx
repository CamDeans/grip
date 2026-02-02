'use client'

import { useState } from 'react'
import { useToast } from '../providers/ToastProvider'
import { Button } from '@/components/ui/Button'

interface UserSettings {
  _id?: string
  name?: string
  githubToken?: string
  notifications?: boolean
}

interface Props {
  initialData?: UserSettings
}

export function UserSettingsForm({ initialData }: Props) {
  const [name, setName] = useState(initialData?.name || '')
  const [githubToken, setGithubToken] = useState(initialData?.githubToken || '')
  const [notifications, setNotifications] = useState(initialData?.notifications || false)
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          githubToken,
          notifications,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      showToast('Settings updated successfully', 'success')
    } catch (error) {
      console.error('Settings update error:', error)
      showToast('Failed to update settings', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text-primary">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="form-input mt-1"
        />
      </div>

      <div>
        <label htmlFor="githubToken" className="block text-sm font-medium text-text-primary">
          GitHub Personal Access Token
        </label>
        <div className="mt-1">
          <input
            type="password"
            id="githubToken"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            className="form-input"
          />
          <p className="mt-1 text-sm text-text-muted">
            Generate a token with repo scope at{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:text-primary-hover"
            >
              GitHub Settings
            </a>
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="notifications"
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-primary"
        />
        <label htmlFor="notifications" className="ml-2 block text-sm text-text-primary">
          Enable email notifications
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} isLoading={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
