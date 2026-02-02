'use client'

import { Manager } from '@/components/terminal/Manager'
import { GradientTitle } from '@/components/ui/GradientTitle'

export default function TerminalPage() {
  return (
    <div className="space-y-6">
      <div>
        <GradientTitle>Terminal</GradientTitle>
        <p className="text-text-secondary">Interact with virtual terminal sessions</p>
      </div>
      
      <div className="h-[calc(100vh-12rem)]">
        <Manager />
      </div>
    </div>
  )
} 
