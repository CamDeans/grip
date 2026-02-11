'use client'

import { useEffect, useRef } from 'react'
import { toast as sonnerToast } from 'sonner'

const STORAGE_KEY = 'grip-app-updates-shown'

export function AppUpdatesToaster() {
  const shownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null
    if (stored) {
      try {
        shownRef.current = new Set(JSON.parse(stored))
      } catch {
        shownRef.current = new Set()
      }
    }

    fetch('/api/app-updates')
      .then((r) => (r.ok ? r.json() : { updates: [] }))
      .then((d) => {
        const updates = (d.updates || []) as { _id: string; message: string; type?: string }[]
        updates.forEach((u) => {
          if (shownRef.current.has(u._id)) return
          shownRef.current.add(u._id)
          if (u.type === 'downtime') {
            sonnerToast.warning('App update', { description: u.message })
          } else {
            sonnerToast.info('App update', { description: u.message })
          }
        })
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...shownRef.current]))
        }
      })
      .catch(() => {})
  }, [])

  return null
}
