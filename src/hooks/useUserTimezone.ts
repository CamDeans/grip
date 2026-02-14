'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Returns the user's timezone from settings (Dashboard → Settings → Preferences).
 * Used so date/time displays (notifications, sidebar, etc.) respect the user's timezone.
 */
export function useUserTimezone(): string | undefined {
  const { data: session, status } = useSession()
  const [timezone, setTimezone] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return
    let cancelled = false
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.preferences?.timezone) {
          setTimezone(data.preferences.timezone)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [session?.user, status])

  return timezone
}
