'use client'

import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { HomeIcon, ChatBubbleLeftIcon, CodeBracketIcon, BeakerIcon } from '@heroicons/react/24/outline'

export function ProjectNavigation() {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const projectId = params?.id || ''

  // Add a guard to prevent rendering with invalid projectId
  if (!projectId) {
    return null;
  }

  // Define navigation items
  const navItems = [
    { 
      name: 'Home', 
      href: `/projects/${projectId}`, 
      icon: HomeIcon,
      active: pathname === `/projects/${projectId}` 
    },
    { 
      name: 'Enhanced Chat', 
      href: `/projects/${projectId}/enhanced-chat`, 
      icon: ChatBubbleLeftIcon,
      active: pathname === `/projects/${projectId}/enhanced-chat` 
    },
    { 
      name: 'Code Generator', 
      href: `/projects/${projectId}/code-generator`, 
      icon: CodeBracketIcon,
      active: pathname === `/projects/${projectId}/code-generator` 
    },
    { 
      name: 'Test DB', 
      href: `/projects/${projectId}/test-db`, 
      icon: BeakerIcon,
      active: pathname === `/projects/${projectId}/test-db` 
    }
  ]

  return (
    <div className="mb-6 pt-2">
      <nav className="flex flex-row space-x-2 overflow-x-auto pb-2">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <Button 
              variant={item.active ? 'default' : 'ghost'} 
              className="flex items-center space-x-2"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Button>
          </Link>
        ))}
      </nav>
      <div className="border-b border-border-default mt-2"></div>
    </div>
  )
} 