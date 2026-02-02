'use client'

import { useMemo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'
import { AIMessage } from '@/types/chat'
import { FilePreview } from './FilePreview'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { useState } from 'react'

// Phase 8, Step 5: Enhanced message formatting for code and technical content
interface FormattedMessageProps {
  message: AIMessage
  className?: string
}

export function FormattedMessage({ message, className }: FormattedMessageProps) {
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null)

  // Extract code blocks and format content
  const { formattedContent, codeBlocks } = useMemo(() => {
    // If no content, return empty
    if (!message.content) {
      return { formattedContent: '', codeBlocks: [] }
    }
    
    // If content doesn't have code blocks, return as is
    if (!message.content.includes('```')) {
      return { formattedContent: message.content, codeBlocks: [] }
    }
    
    // Replace code blocks with placeholders and collect info
    const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g
    const codeBlocks: Array<{ language: string; code: string; placeholder: string }> = []
    
    // Add placeholders for code blocks
    let formattedContent = message.content.replace(codeBlockRegex, (match, language, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
      codeBlocks.push({
        language: language || 'plaintext',
        code: code.trim(),
        placeholder
      })
      return placeholder
    })
    
    return { formattedContent, codeBlocks }
  }, [message.content])

  // Handle copy to clipboard
  const copyToClipboard = (text: string, blockIndex: number) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedBlockIndex(blockIndex)
        setTimeout(() => setCopiedBlockIndex(null), 2000)
      },
      (err) => {
        console.error('Could not copy text: ', err)
      }
    )
  }
  
  return (
    <div className={cn('space-y-4 w-full', className)}>
      {/* Split by placeholders and render with code blocks */}
      {formattedContent.split(/(__CODE_BLOCK_\d+__)/).map((part, i) => {
        // Check if part is a code block placeholder
        const codeBlockMatch = part.match(/__CODE_BLOCK_(\d+)__/)
        if (codeBlockMatch) {
          // Get the code block by index
          const blockIndex = parseInt(codeBlockMatch[1], 10)
          const block = codeBlocks[blockIndex]
          
          // Detect if this might be a file path
          const isFilePath = block.code.includes('/') && !block.code.includes('\n')
          
          if (isFilePath && message.code?.path === block.code.trim()) {
            // Render as file preview if we have matching path in message.code
            return (
              <FilePreview
                key={i}
                filename={message.code.path}
                language={message.code.language}
                content={message.code.content}
              />
            )
          }
          
          // Otherwise render as syntax highlighted code block
          return (
            <div key={i} className="rounded-md overflow-hidden border border-border w-full max-w-full">
              <div className="bg-background-tertiary text-text-secondary px-3 py-1 text-xs flex justify-between items-center">
                <span>{getLanguageLabel(block.language)}</span>
                <button
                  className="hover:text-white text-text-muted flex items-center gap-1"
                  onClick={() => copyToClipboard(block.code, blockIndex)}
                >
                  {copiedBlockIndex === blockIndex ? (
                    <>
                      <CheckIcon className="h-3 w-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="overflow-x-auto w-full max-w-full">
                <SyntaxHighlighter
                  language={mapLanguage(block.language)}
                  style={tomorrow}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '0.9rem',
                    backgroundColor: '#1e293b', // Match your theme
                    maxWidth: '100%',
                    overflowX: 'auto'
                  }}
                  wrapLines={true}
                  wrapLongLines={true}
                >
                  {block.code}
                </SyntaxHighlighter>
              </div>
            </div>
          )
        }
        
        // Otherwise, render as normal text with word wrapping
        return part ? <p key={i} className="whitespace-pre-wrap break-words w-full">{part}</p> : null
      })}
      
      {/* If message has code but not in content, show separately */}
      {message.code && !codeBlocks.some(block => block.code.includes(message.code?.content || '')) && (
        <FilePreview
          filename={message.code.path || 'snippet.txt'}
          language={message.code.language}
          content={message.code.content}
        />
      )}
    </div>
  )
}

// Helper function to get a nice label for the language
function getLanguageLabel(language: string): string {
  const languageMap: Record<string, string> = {
    js: 'JavaScript',
    jsx: 'React JSX',
    ts: 'TypeScript',
    tsx: 'React TSX',
    py: 'Python',
    rb: 'Ruby',
    java: 'Java',
    cpp: 'C++',
    cs: 'C#',
    go: 'Go',
    rs: 'Rust',
    php: 'PHP',
    swift: 'Swift',
    kt: 'Kotlin',
    sh: 'Shell',
    bash: 'Bash',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    md: 'Markdown',
    json: 'JSON',
    yaml: 'YAML',
    xml: 'XML'
  }
  
  return languageMap[language.toLowerCase()] || language
}

// Map language identifiers to those supported by Prism
function mapLanguage(language: string): string {
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    sh: 'bash',
    yml: 'yaml'
    // Add more mappings as needed
  }
  
  return languageMap[language.toLowerCase()] || language
} 