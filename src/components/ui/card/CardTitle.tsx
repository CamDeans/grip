"use client"

import * as React from "react"
import { cn } from '@/lib/client-utils'
import { GradientTitle, GradientTitleProps } from '@/components/ui/GradientTitle'

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  GradientTitleProps
>(({ className, ...props }, ref) => (
  <GradientTitle
    ref={ref}
    as="h3"
    className={cn(className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

export { CardTitle } 
