'use client'

import { Navigation } from './Navigation'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background-primary min-w-0 overflow-x-hidden">
      <Navigation />
      
      <main className="flex-1 pl-16 min-w-0 w-full overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 min-w-0">
          {children}
        </div>
      </main>
    </div>
  )
}
