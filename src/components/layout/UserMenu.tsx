'use client'

import { Fragment } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  UserCircleIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui'
import { toast } from '@/components/ui/use-toast'

export function UserMenu() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const handleSignOut = async () => {
    try {
      toast({
        title: "Signing out...",
        description: "Please wait while we sign you out",
      })
      await signOut({ redirect: false })
      toast({
        title: "Signed out successfully",
      })
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: "Failed to sign out",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }
  
  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 shrink-0 aspect-square rounded-full bg-background-primary p-0"
            aria-label="User menu"
          >
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User avatar'}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <UserCircleIcon className="h-8 w-8 text-text-secondary" />
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56 p-2">
          <div className="flex items-center gap-2 p-2 border-b border-border mb-1">
            <div className="h-8 w-8 relative rounded-full overflow-hidden bg-background-secondary flex items-center justify-center">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User avatar'}
                  fill
                  className="object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5 text-text-secondary" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs leading-none text-text-secondary truncate max-w-[140px]">
                {session?.user?.email || ''}
              </p>
            </div>
          </div>
          
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push('/dashboard/settings')}
          >
            <Cog6ToothIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem
            className="cursor-pointer text-destructive"
            onClick={handleSignOut}
          >
            <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 