'use client'

import { XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline'

interface Tab {
  id: string
  title: string
  language: string
}

interface EditorTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onTabClose: (tabId: string) => void
}

export function EditorTabs({ tabs, activeTab, onTabChange, onTabClose }: EditorTabsProps) {
  return (
    <div className="flex items-center border-b border-border-default">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            group relative flex items-center px-4 py-2 text-sm
            ${activeTab === tab.id 
              ? 'border-b-2 border-primary-500 text-text-primary' 
              : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          <button
            onClick={() => onTabChange(tab.id)}
            className="flex items-center space-x-2"
            aria-label={`Switch to ${tab.title} tab`}
            title={`Switch to ${tab.title}`}
          >
            <DocumentIcon className="h-4 w-4" />
            <span>{tab.title}</span>
          </button>
          
          <button
            onClick={() => onTabClose(tab.id)}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Close ${tab.title} tab`}
            title={`Close ${tab.title}`}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
