'use client'

// Import global polyfill first to ensure it's loaded before any MongoDB code
import '@/lib/polyfill'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './ThemeProvider'
import { Toaster } from 'sonner'

const toastClassNames = {
  toast: 'grip-toast',
  title: 'grip-toast-title',
  description: 'grip-toast-description',
  success: 'grip-toast-success',
  error: 'grip-toast-error',
  warning: 'grip-toast-warning',
  info: 'grip-toast-info',
  closeButton: 'grip-toast-close',
}

export function Providers({ children, session }: { children: React.ReactNode, session: any }) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        {children}
        <Toaster
          theme="system"
          position="top-right"
          closeButton
          toastOptions={{
            classNames: toastClassNames,
            style: {
              background: 'var(--background-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-md)',
            },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  )
}
