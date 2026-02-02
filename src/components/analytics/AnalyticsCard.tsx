"use client"

import * as React from "react"
import { cn } from '@/lib/client-utils'
import { GradientTitle } from '@/components/ui/GradientTitle'

interface AnalyticsCardProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function AnalyticsCard({ title, children, className, ...props }: AnalyticsCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-default bg-background-secondary p-6',
        'shadow-sm hover:shadow-md transition-all duration-200 ease-in-out',
        'hover:border-border-hover',
        className
      )}
      {...props}
    >
      {title && <GradientTitle as="h3">{title}</GradientTitle>}
      {children}
    </div>
  )
} 
