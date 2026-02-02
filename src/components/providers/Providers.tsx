'use client'

// Import global polyfill first to ensure it's loaded before any MongoDB code
import '@/lib/polyfill'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from './ThemeProvider'
import { Toaster } from 'sonner'

export function Providers({ children, session }: { children: React.ReactNode, session: any }) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  )
}
