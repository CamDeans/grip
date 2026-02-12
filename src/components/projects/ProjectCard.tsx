'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  FolderIcon, 
  ClockIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { GradientTitle } from '@/components/ui/GradientTitle'

interface ProjectCardProps {
  _id: string
  title: string
  description: string
  repository: {
    owner: string
    name: string
  }
  lastUpdated: string
  messageCount: number
  language?: string
  languageColor?: string
  status?: 'active' | 'completed' | 'archived'
  isSandbox?: boolean
  onDelete?: (projectId: string) => void
}

const statusStyles: Record<string, string> = {
  active: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20',
  archived: 'bg-text-muted/10 text-text-muted border-border',
}

export function ProjectCard({
  _id,
  title,
  description,
  lastUpdated,
  messageCount,
  language,
  languageColor = '#4c6ef5',
  status = 'active',
  isSandbox = false,
  onDelete,
}: ProjectCardProps) {
  const isSampleProject = _id === 'sample'
  const href = `/dashboard/projects/${_id}`

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!onDelete || isSampleProject) return
    const label = isSandbox ? 'sandbox experiment' : 'project'
    if (!confirm(`Permanently delete this ${label} and all its data? This cannot be undone.`)) return
    onDelete(_id)
  }

  const cardContent = (
    <>
      <div className="flex flex-col space-y-4 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start space-x-4 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
              <FolderIcon className="h-5 w-5 text-primary-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <GradientTitle as="h3" className="truncate">{title}</GradientTitle>
                {!isSampleProject && (
                  <span className={['text-xs font-medium rounded-full px-2 py-0.5 border shrink-0 capitalize', statusStyles[status] || statusStyles.active].join(' ')}>
                    {status}
                  </span>
                )}
                {isSandbox && (
                  <span className="text-xs font-medium rounded-full px-2 py-0.5 border shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                    Experiment
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-secondary line-clamp-2 break-words">
                {description}
              </p>
            </div>
          </div>
          {!isSampleProject && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="shrink-0 p-2 rounded-md text-text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label={isSandbox ? 'Delete experiment' : 'Delete project'}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {language && (
              <div className="flex items-center space-x-2 shrink-0">
                <span 
                  className={`h-3 w-3 rounded-full shrink-0 language-dot-${language.toLowerCase()}`}
                  data-color={languageColor}
                />
                <span className="text-sm text-text-secondary truncate">
                  {language}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-text-secondary shrink-0">
              <ChatBubbleLeftIcon className="h-4 w-4" />
              <span className="text-sm">{messageCount}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-text-secondary shrink-0">
            <ClockIcon className="h-4 w-4" />
            <time className="text-sm">
              {new Date(lastUpdated).toLocaleDateString()}
            </time>
          </div>
        </div>

        {!isSampleProject && (
          <div className="absolute bottom-0 left-0 right-0 h-1 w-full bg-gradient-to-r from-primary-500 to-accent-purple opacity-0 transition-opacity group-hover:opacity-100 rounded-b-lg" />
        )}
      </div>
    </>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="h-full min-w-0"
    >
      {isSampleProject ? (
        <div className="block p-6 h-full min-w-0 overflow-hidden relative group rounded-lg border border-border bg-background-secondary shadow-sm">
          {cardContent}
        </div>
      ) : (
        <Link
          href={href}
          className="block p-6 h-full min-w-0 overflow-hidden relative group rounded-lg border border-border bg-background-secondary shadow-sm hover:shadow-md hover:border-border-hover transition-all duration-200 cursor-pointer project-card"
          aria-label={`Open ${title}`}
        >
          {cardContent}
        </Link>
      )}
    </motion.div>
  )
}
