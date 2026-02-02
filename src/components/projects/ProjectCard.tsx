'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  FolderIcon, 
  ArrowRightIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
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
}

export function ProjectCard({
  _id,
  title,
  description,
  lastUpdated,
  messageCount,
  language,
  languageColor = '#4c6ef5'
}: ProjectCardProps) {
  const isSampleProject = _id === 'sample'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="block p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                <FolderIcon className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <GradientTitle as="h3">{title}</GradientTitle>
                <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                  {description}
                </p>
              </div>
            </div>
            {!isSampleProject && (
              <Link
                href={`/dashboard/projects/${_id}`}
                className="rounded-full p-2 text-text-secondary hover:bg-background-tertiary hover:text-text-primary"
              >
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {language && (
                <div className="flex items-center space-x-2">
                  <span 
                    className={`h-3 w-3 rounded-full language-dot-${language.toLowerCase()}`}
                    data-color={languageColor}
                  />
                  <span className="text-sm text-text-secondary">
                    {language}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2 text-text-secondary">
                <ChatBubbleLeftIcon className="h-4 w-4" />
                <span className="text-sm">{messageCount}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-text-secondary">
              <ClockIcon className="h-4 w-4" />
              <time className="text-sm">
                {new Date(lastUpdated).toLocaleDateString()}
              </time>
            </div>
          </div>

          {/* Activity indicator */}
          {!isSampleProject && (
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary-500 to-accent-purple opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </div>
      </div>
    </motion.div>
  )
}
