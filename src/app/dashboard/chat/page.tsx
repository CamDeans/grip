'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default function ChatPage() {
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-theme(spacing.16))]">
        <PageHeader
          title="AI Chat"
          description="Interact with your AI assistant"
        />
        
        <div className="mt-8 h-[calc(100%-theme(spacing.32))]">
          <ChatInterface />
        </div>
      </div>
    </DashboardLayout>
  )
}
