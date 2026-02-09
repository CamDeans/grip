'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { RefreshCw } from 'lucide-react'

interface PlanningRefreshButtonProps {
  className?: string
}

/**
 * Refresh button for the planning page. Calls router.refresh() so the server
 * re-fetches the plan and the "Go to Develop" block appears when the plan exists.
 */
export function PlanningRefreshButton({ className }: PlanningRefreshButtonProps) {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.refresh()}
      className={className}
      icon={<RefreshCw className="h-4 w-4" />}
      aria-label="Refresh to see next steps"
    >
      Refresh
    </Button>
  )
}
