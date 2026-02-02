'use client'

import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface PreviewProps {
  code: string
  language: string
}

export function CodePreview({ code, language }: PreviewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-background-primary shadow">
      <div className="border-b border-border bg-background-secondary px-4 py-2">
        <h3 className="text-sm font-medium text-text-primary">Code Preview</h3>
      </div>
      <div className="p-4">
        <SyntaxHighlighter
          language={language}
          style={tomorrow}
          customStyle={{
            margin: 0,
            borderRadius: '0.375rem',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
