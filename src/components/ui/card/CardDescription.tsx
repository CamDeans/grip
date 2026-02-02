"use client"

import * as React from "react"
import { cn } from '@/lib/client-utils'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-text-secondary", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export { CardDescription } 
