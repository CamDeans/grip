import { forwardRef } from 'react'
import { cn } from '@/lib/client-utils'

export interface GradientTitleProps {
  children: React.ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const GradientTitle = forwardRef<HTMLHeadingElement, GradientTitleProps>(
  ({ children, className, as: Component = 'h1', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'font-semibold tracking-tight text-text-primary',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

GradientTitle.displayName = 'GradientTitle' 