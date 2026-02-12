'use client'

import { cn } from '@/lib/utils'

/**
 * Full G.R.I.P. logo (icon + wordmark) using theme primary color and glow.
 * Use className for size: default h-9; landing can use h-9 sm:h-10; sidebar h-9.
 * Use parent class "logo logo-glow" for green/teal and glow.
 */
export function FullLogo({ className, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 32"
      fill="none"
      aria-hidden="true"
      className={cn('h-9 w-auto min-w-0 shrink-0', className)}
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4L4 8L12 12L20 8L12 4Z" />
        <path d="M4 20L12 24L20 20" />
        <path d="M4 14L12 18L20 14" />
      </g>
      <text
        x="28"
        y="22"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="18"
        fontWeight="800"
        fill="currentColor"
      >
        G.R.I.P.
      </text>
    </svg>
  )
}
