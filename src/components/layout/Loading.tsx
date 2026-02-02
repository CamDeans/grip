'use client'

import React from 'react'
import { cn } from '@/lib/client-utils'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  center?: boolean
}

/**
 * Loading component with skeleton animation for better perceived performance
 * Used as a Suspense fallback for lazy-loaded components
 */
export default function Loading({ message = 'Loading...', className, size = 'md', center = true }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }
  
  return (
    <div 
      className={cn(
        'flex flex-col items-center gap-3',
        center && 'justify-center min-h-[200px]',
        className
      )}
    >
      <div className="animate-pulse flex flex-col items-center gap-3">
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  )
} 