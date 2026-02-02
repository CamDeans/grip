'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/client-utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'danger'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  isLoading?: boolean
  icon?: React.ReactNode
  asChild?: boolean
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-primary text-primary-foreground shadow hover:bg-primary-hover focus-visible:ring-primary',
  destructive:
    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive',
  outline:
    'border border-border bg-transparent hover:bg-background-hover hover:text-text-primary focus-visible:ring-primary',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:ring-secondary',
  ghost: 'hover:bg-accent hover:text-accent-foreground focus-visible:ring-primary',
  link: 'text-primary underline-offset-4 hover:underline focus-visible:ring-primary',
  danger:
    'bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3 text-sm',
  lg: 'h-11 rounded-md px-8 text-base',
  icon: 'h-10 w-10 p-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      isLoading = false,
      icon,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    if (asChild && typeof children === 'object' && children !== null && 'type' in children) {
      return <>{children}</>
    }
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled ?? isLoading}
        data-testid="button"
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="sr-only">Loading</span>
            <span aria-hidden>Loading...</span>
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
