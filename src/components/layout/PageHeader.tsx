'use client'

import { GradientTitle } from '@/components/ui/GradientTitle'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <GradientTitle>{title}</GradientTitle>
          {description && (
            <p className="mt-1 text-text-secondary">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
