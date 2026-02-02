'use client'

import { LoadingSpinner } from './LoadingSpinner'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <LoadingSpinner size={size} className="text-primary-500" />
      <p className="text-text-secondary animate-pulse">{message}</p>
    </div>
  )
}
