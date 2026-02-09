'use client'

import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  HomeIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useSession, signOut } from 'next-auth/react'
import { cn } from '@/lib/client-utils'
import { QuickSearch } from '../search/QuickSearch'
import { NotificationsPopover } from '../notifications/NotificationsPopover'
import { Button } from '@/components/ui'
import { TerminalIcon } from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderIcon },
  { name: 'Terminal', href: '/dashboard/terminal', icon: TerminalIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  
  // This is necessary to avoid hydration mismatch when rendering theme-dependent UI
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/login');
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "There was a problem signing out",
        variant: "destructive",
      });
    }
  };

  const navigation = baseNavigation

  const renderNavItems = () => (
    <ul role="list" className="-mx-2 space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href || 
                         (item.href !== '/dashboard' && pathname?.startsWith(item.href))
        return (
          <li key={item.name}>
            <Link
              href={item.href}
              className={cn(
                'group flex items-center gap-x-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              )}
            >
              {isActive && (
                <span 
                  className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-primary" 
                  aria-hidden="true"
                />
              )}
              <item.icon 
                className={cn(
                  'h-5 w-5 transition-colors duration-200 flex-shrink-0',
                  isActive ? 'text-primary' : 'text-text-secondary group-hover:text-primary'
                )} 
                aria-hidden="true" 
              />
              <span className="truncate">{item.name}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  const renderThemeToggle = () => {
    if (!mounted) return (
      <Skeleton className="h-9 w-9 rounded-full" />
    )
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full" 
            aria-label="Toggle theme"
          >
            {theme === 'light' && <SunIcon className="h-5 w-5" />}
            {theme === 'dark' && <MoonIcon className="h-5 w-5" />}
            {theme === 'system' && <ComputerDesktopIcon className="h-5 w-5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <SunIcon className="h-4 w-4 mr-2" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <MoonIcon className="h-4 w-4 mr-2" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <ComputerDesktopIcon className="h-4 w-4 mr-2" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderUserMenu = () => {
    if (status === 'loading') return (
      <Skeleton className="h-8 w-8 rounded-full" />
    )
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            aria-label="User menu"
          >
            {session?.user?.image ? (
              <img 
                src={session.user.image} 
                alt={session.user.name || 'User'} 
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="user-avatar">
                <UserCircleIcon className="h-6 w-6 text-white" />
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{session?.user?.name || 'User'}</p>
            <p className="text-xs text-text-secondary truncate">
              {session?.user?.email || 'user@example.com'}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Mobile Sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80" />
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
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background-secondary px-6 py-4 shadow-lg">
                  <div className="flex h-12 shrink-0 items-center">
                    <h1 
                      className="logo text-2xl cursor-pointer"
                      onClick={() => {
                        router.push('/dashboard')
                        setSidebarOpen(false)
                      }}
                    >
                      G.R.I.P.
                    </h1>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        {renderNavItems()}
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex h-full grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background-secondary px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 
              className="logo text-2xl cursor-pointer"
              onClick={() => router.push('/dashboard')}
            >
              G.R.I.P.
            </h1>
          </div>
          <nav className="flex flex-1 flex-col justify-between">
            <div>
              {renderNavItems()}
            </div>
            <div className="mt-auto pt-2 pb-4">
              <div className="px-3 py-2">
                <p className="text-xs uppercase font-medium text-text-secondary tracking-wider">
                  {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-xs text-text-secondary">
                  {session?.user?.name ? `Signed in as ${session.user.name}` : 'Not signed in'}
                </p>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background-secondary/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            aria-label="Open sidebar"
          >
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </Button>

          {/* Separator */}
          <div className="h-6 w-px bg-border lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <Button 
                variant="secondary"
                onClick={() => setIsSearchOpen(true)}
                className="w-full sm:max-w-xs justify-start text-text-secondary"
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline-block">Quick search...</span>
                <div className="ml-auto hidden sm:flex items-center space-x-1">
                  <kbd className="rounded bg-background-tertiary px-1.5 py-0.5 text-xs text-text-secondary">⌘</kbd>
                  <kbd className="rounded bg-background-tertiary px-1.5 py-0.5 text-xs text-text-secondary">K</kbd>
                </div>
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              {renderThemeToggle()}
              <NotificationsPopover />
              {renderUserMenu()}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 py-8 min-w-0 overflow-x-hidden">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl min-w-0 overflow-x-hidden animate-fadeIn">
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="py-4 px-4 sm:px-6 lg:px-8 border-t border-border bg-background-secondary/30">
          <div className="mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center">
            <p className="text-xs text-text-secondary">
              &copy; {new Date().getFullYear()} G.R.I.P. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 sm:mt-0">
              <Link href="/docs" className="text-xs text-text-secondary hover:text-primary">Documentation</Link>
              <Link href="/docs/api" className="text-xs text-text-secondary hover:text-primary">API Reference</Link>
              <Link href="/support" className="text-xs text-text-secondary hover:text-primary">Support</Link>
              <Link href="/contact" className="text-xs text-text-secondary hover:text-primary">Contact</Link>
              <Link href="/attributions" className="text-xs text-text-secondary hover:text-primary">Attributions</Link>
              <Link href="/privacy" className="text-xs text-text-secondary hover:text-primary">Privacy</Link>
              <Link href="/terms" className="text-xs text-text-secondary hover:text-primary">Terms</Link>
            </div>
          </div>
        </footer>
      </div>

      <QuickSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  )
}
