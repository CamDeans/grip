'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  HomeIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CommandPalette } from '../common/CommandPalette'
import { UserMenu } from './UserMenu'
import { ThemeToggle } from './ThemeToggle'
import { NotificationsPopover } from '../notifications/NotificationsPopover'
import { FullLogo } from '@/components/ui/FullLogo'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background-primary">
      <CommandPalette />
      
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          {/* Backdrop overlay */}
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-background-primary" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                {/* Close button */}
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute right-0 top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5 text-text-secondary bg-background-primary rounded-md"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                
                {/* Sidebar content */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background-primary border-r border-border px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center min-w-0">
                    <Link href="/dashboard" className="logo logo-glow flex items-center min-w-0" aria-label="G.R.I.P. dashboard">
                      <FullLogo className="h-9 w-auto" />
                    </Link>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6
                                  ${pathname === item.href 
                                    ? 'bg-primary text-white' 
                                    : 'text-text-secondary hover:text-text-primary hover:bg-background-hover'
                                  }
                                `}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background-primary border-r border-border px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center min-w-0">
            <Link href="/dashboard" className="logo logo-glow flex items-center min-w-0" aria-label="G.R.I.P. dashboard">
              <FullLogo className="h-9 w-auto" />
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6
                          ${pathname === item.href 
                            ? 'bg-primary text-white' 
                            : 'text-text-secondary hover:text-text-primary hover:bg-background-hover'
                          }
                        `}
                      >
                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background-primary px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-text-secondary lg:hidden bg-background-primary rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <NotificationsPopover />
              <ThemeToggle />
              
              {/* Separator */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-border" aria-hidden="true" />
              
              <UserMenu />
            </div>
          </div>
        </div>

        <main className="py-10 min-w-0 overflow-x-hidden">
          <div className="px-4 sm:px-6 lg:px-8 min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
