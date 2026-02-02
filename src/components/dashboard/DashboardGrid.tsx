interface DashboardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
}

const gapClasses = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
}

export function DashboardGrid({ 
  children, 
  columns = 3, 
  gap = 'md' 
}: DashboardGridProps) {
  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]}`}>
      {children}
    </div>
  )
}
