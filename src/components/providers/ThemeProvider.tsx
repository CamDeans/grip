'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={['light', 'dark']}
      value={{
        light: 'light-theme',
        dark: 'dark-theme',
        system: 'system-theme'
      }}
    >
      {children}
    </NextThemesProvider>
  )
} 
