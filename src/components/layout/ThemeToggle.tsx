'use client'

import { useTheme } from 'next-themes'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          title="Toggle theme"
          className="bg-background-primary"
        >
          {theme === 'light' ? (
            <SunIcon className="h-5 w-5" />
          ) : theme === 'dark' ? (
            <MoonIcon className="h-5 w-5" />
          ) : (
            <ComputerDesktopIcon className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          className="cursor-pointer flex items-center"
          onClick={() => setTheme('light')}
        >
          <SunIcon className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer flex items-center"
          onClick={() => setTheme('dark')}
        >
          <MoonIcon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="cursor-pointer flex items-center"
          onClick={() => setTheme('system')}
        >
          <ComputerDesktopIcon className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 