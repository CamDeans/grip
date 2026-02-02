'use client'

import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  DocumentIcon,
  FolderIcon 
} from '@heroicons/react/24/outline'

interface FileTreeItem {
  name: string
  type: 'file' | 'directory'
  children?: FileTreeItem[]
  content?: string
  language?: string
}

interface CodeEditorProps {
  files: FileTreeItem[]
}

export function CodeEditor({ files }: CodeEditorProps) {
  const [selectedFile, setSelectedFile] = useState<FileTreeItem | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFileTree = (items: FileTreeItem[], path = '') => {
    return (
      <ul className="space-y-1">
        {items.map((item) => {
          const itemPath = `${path}/${item.name}`
          const isExpanded = expandedFolders.has(itemPath)

          return (
            <li key={itemPath}>
              <button
                onClick={() => {
                  if (item.type === 'directory') {
                    toggleFolder(itemPath)
                  } else {
                    setSelectedFile(item)
                  }
                }}
                className={`
                  flex items-center w-full px-2 py-1 rounded-md text-sm
                  ${item.type === 'file' 
                    ? 'hover:bg-background-tertiary' 
                    : 'text-text-secondary'
                  }
                  ${selectedFile === item ? 'bg-primary-500/10 text-primary-500' : 'text-text-primary'}
                `}
              >
                {item.type === 'directory' ? (
                  <>
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 mr-1" />
                    )}
                    <FolderIcon className="h-4 w-4 mr-2 text-text-secondary" />
                  </>
                ) : (
                  <DocumentIcon className="h-4 w-4 mr-2 text-text-secondary" />
                )}
                {item.name}
              </button>
              
              {item.type === 'directory' && isExpanded && item.children && (
                <div className="ml-4 mt-1 border-l border-border-default">
                  {renderFileTree(item.children, itemPath)}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="flex h-full border border-border-default rounded-lg overflow-hidden">
      {/* File Explorer */}
      <div className="w-64 bg-background-secondary border-r border-border-default p-4">
        <div className="text-sm font-medium text-text-secondary mb-4">
          Explorer
        </div>
        {renderFileTree(files)}
      </div>

      {/* Code View */}
      <div className="flex-1 bg-background-primary overflow-auto">
        {selectedFile ? (
          <div className="p-4">
            <div className="text-sm font-medium text-text-secondary mb-2">
              {selectedFile.name}
            </div>
            <SyntaxHighlighter
              language={selectedFile.language || 'typescript'}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                borderRadius: '0.5rem',
                backgroundColor: 'transparent',
              }}
            >
              {selectedFile.content || ''}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-secondary">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  )
}
