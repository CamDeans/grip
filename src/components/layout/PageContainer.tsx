'use client'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className="min-h-screen bg-background-primary py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex flex-col space-y-8 ${className}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
