'use client'

import { useState } from 'react'
import { Terminal } from '@/components/terminal/Terminal'

export function GuidedWrapper() {
  const [terminals, setTerminals] = useState<string[]>(['test-terminal'])

  const handleDelete = (id: string) => {
    setTerminals(prev => prev.filter(terminalId => terminalId !== id))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-background-secondary rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Terminal Test</h2>
        <p className="text-text-secondary">
          Use this terminal to test commands and functionality.
        </p>
      </div>
      
      {terminals.map(id => (
        <Terminal
          key={id}
          id={id}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
} 