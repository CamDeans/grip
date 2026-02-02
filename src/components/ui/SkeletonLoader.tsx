interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`
        animate-pulse bg-background-tertiary rounded-md
        ${className}
      `}
    />
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border border-border-default bg-background-secondary p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}
