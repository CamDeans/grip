'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  FolderIcon,
  ChatBubbleLeftIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderIcon },
  { name: 'Chat', href: '/dashboard/chat', icon: ChatBubbleLeftIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
]

export function Navigation() {
  const pathname = usePathname()
  const [isHovered, setIsHovered] = useState<string | null>(null)

  return (
    <nav className="fixed inset-y-0 left-0 w-16 bg-background-secondary border-r border-border-default">
      <div className="flex h-full flex-col items-center justify-between py-4">
        <div className="space-y-4 w-full">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className="relative flex h-10 w-full items-center justify-center"
                onMouseEnter={() => setIsHovered(item.name)}
                onMouseLeave={() => setIsHovered(null)}
              >
                <div className={`
                  flex h-10 w-10 items-center justify-center rounded-lg
                  ${isActive ? 'bg-background-tertiary text-text-primary' : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'}
                  transition-all duration-200
                `}>
                  <item.icon className="h-5 w-5" />
                </div>

                {/* Tooltip */}
                {isHovered === item.name && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-background-tertiary border border-border-default"
                  >
                    <div className="text-sm text-text-primary whitespace-nowrap">
                      {item.name}
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-border-default" />
                  </motion.div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-primary-500"
                  />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
