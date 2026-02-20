'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'

export interface BackAndDashboardNavProps {
  /** Fallback URL when there is no history (e.g. user landed directly). */
  backFallbackHref?: string
  /** Optional label for Back (default: "Back"). */
  backLabel?: string
  /** Optional class for the container. */
  className?: string
}

/**
 * Bottom nav: Back (one page) and Dashboard. Use on docs and other pages
 * so users can go back one page or to the dashboard.
 */
export function BackAndDashboardNav({
  backFallbackHref = '/docs',
  backLabel = 'Back',
  className = '',
}: BackAndDashboardNavProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(backFallbackHref)
    }
  }

  return (
    <nav
      className={`flex flex-wrap items-center gap-3 border-t border-border bg-background-secondary px-4 py-4 ${className}`}
      aria-label="Page navigation"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={handleBack}
        icon={<ArrowLeftIcon className="h-4 w-4" />}
        type="button"
      >
        {backLabel}
      </Button>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background-primary px-3 py-2 text-sm font-medium text-text-primary hover:bg-background-tertiary hover:text-primary transition-colors"
      >
        <HomeIcon className="h-4 w-4" />
        Dashboard
      </Link>
    </nav>
  )
}
