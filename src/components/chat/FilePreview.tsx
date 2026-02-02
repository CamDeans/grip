'use client'

import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { CopyIcon, DownloadIcon, CheckIcon, FileIcon, XIcon, MaximizeIcon, MinimizeIcon } from 'lucide-react'
import { cn } from '@/lib/client-utils'

// Phase 8, Step 3: Create File Preview component

interface FilePreviewProps {
  fileId?: string
  projectId?: string
  filename?: string
  path?: string
  language?: string
  content?: string
  className?: string
  onClose?: () => void
}

export function FilePreview({ 
  fileId, 
  projectId, 
  filename = '', 
  path = '', 
  language = 'typescript', 
  content = '', 
  className,
  onClose 
}: FilePreviewProps) {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fileContent, setFileContent] = useState(content)
  const [fileLanguage, setFileLanguage] = useState(language)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  
  // Fetch file content if not provided directly
  useEffect(() => {
    const fetchFileContent = async () => {
      if (content) {
        setFileContent(content)
        return
      }
      
      if (!fileId && !projectId) {
        setError('No file identifier provided')
        return
      }
      
      setIsLoading(true)
      setError(null)
      
      try {
        let url = '/api/project-files?'
        
        if (fileId) {
          url += `fileId=${fileId}`
        } else if (projectId) {
          url += `projectId=${projectId}`
          
          if (path) url += `&path=${encodeURIComponent(path)}`
          if (filename) url += `&filename=${encodeURIComponent(filename)}`
        }
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`)
        }
        
        const data = await response.json()
        
        if (Array.isArray(data) && data.length > 0) {
          setFileContent(data[0].content)
          setFileLanguage(data[0].language)
        } else if (data.content) {
          setFileContent(data.content)
          setFileLanguage(data.language)
        } else {
          throw new Error('File not found')
        }
      } catch (err) {
        console.error('Error fetching file:', err)
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (!fileContent) {
      fetchFileContent()
    }
    
    setMounted(true)
  }, [fileId, projectId, path, filename, content])
  
  // Copy content to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fileContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  // Download file
  const downloadFile = () => {
    const element = document.createElement('a')
    const file = new Blob([fileContent], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = filename || 'file.txt'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }
  
  if (!mounted) {
    return null
  }
  
  const displayFilename = filename || path.split('/').pop() || 'File'
  
  return (
    <div 
      className={cn(
        "rounded-lg border border-border bg-background shadow w-full transition-all",
        expanded ? "fixed inset-4 z-50" : "relative",
        className
      )}
    >
      <div className="border-b border-border bg-background-secondary px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <FileIcon className="h-4 w-4 mr-2 text-muted-foreground" />
          <h3 className="text-sm font-medium">{displayFilename}</h3>
          <Badge variant="outline" className="ml-2 text-xs">
            {fileLanguage}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={downloadFile}
            title="Download file"
          >
            <DownloadIcon className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Minimize" : "Maximize"}
          >
            {expanded ? <MinimizeIcon className="h-3 w-3" /> : <MaximizeIcon className="h-3 w-3" />}
          </Button>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={onClose}
              title="Close preview"
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className={cn("relative overflow-auto", expanded ? "h-[calc(100%-40px)]" : "max-h-[400px]")}>
        {isLoading ? (
          <div className="flex items-center justify-center p-4 h-[200px]">
            <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent" />
            <span className="ml-2 text-sm">Loading file...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            <p>{error}</p>
          </div>
        ) : (
          <SyntaxHighlighter
            language={fileLanguage}
            style={tomorrow}
            customStyle={{
              margin: 0,
              borderRadius: '0',
              minHeight: '100px',
              fontSize: '0.8rem',
              lineHeight: '1.4'
            }}
            showLineNumbers
          >
            {fileContent}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  )
} 