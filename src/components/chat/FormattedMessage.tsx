'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'
import { AIMessage } from '@/types/chat'
import { FilePreview } from './FilePreview'
import { CopyIcon, CheckIcon, Save, Loader2, FileCheck, ExternalLink, FilePenLine, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { toast as sonnerToast } from 'sonner'

// Phase 8, Step 5: Enhanced message formatting for code and technical content
// Chat → projectFiles: Save code blocks to project so they appear in Generated files and export
// Only content inside ``` code blocks is saved to project files; plain text is not.
interface FormattedMessageProps {
  message: AIMessage
  className?: string
  projectId?: string
  projectFiles?: Array<{ id: string; path: string; filename: string }>
  onFileSaved?: () => void
}

/** Default filename from language when no path is parsed. Never use snippet.* — use file.<ext> so users don't overwrite the same file. */
function defaultFilenameFromLanguage(lang: string): string {
  const ext: Record<string, string> = {
    ts: 'file.ts', tsx: 'file.tsx', js: 'file.js', jsx: 'file.jsx',
    py: 'file.py', css: 'file.css', html: 'file.html', json: 'file.json',
    md: 'file.md', yaml: 'file.yaml', yml: 'file.yml',
    env: '.env', plaintext: 'file.txt', text: 'file.txt',
  }
  return ext[lang?.toLowerCase()] || 'file.txt'
}

/** Infer a better filename from content: package.json, .env, .env.local, etc. Never use snippet.txt for env or known types when inferrable. */
function inferredFilenameForBlock(lang: string, code: string): string {
  const l = (lang || '').toLowerCase()
  const content = (code || '').trim()
  if (l === 'json' && content) {
    try {
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object' && ('name' in parsed || 'version' in parsed) && ('dependencies' in parsed || 'scripts' in parsed || 'devDependencies' in parsed)) {
        return 'package.json'
      }
    } catch {
      // not valid JSON or not package.json shape
    }
  }
  // Detect .env / .env.local content: KEY=value or KEY="value" or export KEY=value
  if (content && /^(export\s+)?[A-Z_][A-Z0-9_]*\s*=\s*(.*)$/m.test(content) && !content.includes('{') && !content.includes('import ')) {
    if (content.includes('LOCAL') || content.toLowerCase().includes('.local')) return '.env.local'
    return '.env'
  }
  return defaultFilenameFromLanguage(lang)
}

/** Display path for saved file (path/filename or filename) */
function savedFilePath(path: string, filename: string): string {
  return path ? `${path}/${filename}` : filename
}

/** Normalize a full path string into { path, filename } (path = dir, filename = basename) */
function toPathAndFilename(full: string): { path: string; filename: string } {
  const trimmed = full.trim()
  const lastSlash = trimmed.lastIndexOf('/')
  if (lastSlash >= 0) return { path: trimmed.slice(0, lastSlash), filename: trimmed.slice(lastSlash + 1) }
  return { path: '', filename: trimmed }
}

/**
 * Parse file path from text before a code block.
 * Prefer the path CLOSEST to the block (last in preceding text), not an earlier reference like a repo file.
 * E.g. "from your existing `demo2_A4.js` ... **src/engine/GameEngine.ts**" → use src/engine/GameEngine.ts.
 */
function parseFilePathFromPrecedingText(text: string): { path: string; filename: string } | null {
  if (!text?.trim()) return null
  const trimmed = text.trim()
  const extPattern = /\.(?:tsx?|jsx?|css|html|json|md|py|yml|yaml)$/i
  type Candidate = { full: string; index: number }
  const candidates: Candidate[] = []
  // All backtick-wrapped paths that look like files
  const backtickRegex = /`([^`]+)`/g
  let m
  while ((m = backtickRegex.exec(trimmed)) !== null) {
    const full = m[1].trim()
    if (extPattern.test(full)) candidates.push({ full, index: m.index })
  }
  // All bold-wrapped **path/filename.ext**
  const boldRegex = /\*\*([^*]+)\*\*/g
  while ((m = boldRegex.exec(trimmed)) !== null) {
    const full = m[1].trim()
    if (extPattern.test(full)) candidates.push({ full, index: m.index })
  }
  // Path-like at end of line (often the block header)
  const pathLikeRegex = /([\w./-]+\.(?:tsx?|jsx?|css|html|json|md|py|yml|yaml))\s*:?\s*$/gm
  while ((m = pathLikeRegex.exec(trimmed)) !== null) {
    const full = m[1].trim()
    candidates.push({ full, index: m.index })
  }
  if (candidates.length === 0) return null
  // Use the candidate that appears LAST (closest to the code block) so we use the block's target path, not a prior reference
  const last = candidates.reduce((best, c) => (c.index >= best.index ? c : best))
  return toPathAndFilename(last.full)
}

/** Get preceding text for each code block (text before that block's placeholder) */
function getPrecedingTextByBlock(content: string): Record<number, string> {
  const result: Record<number, string> = {}
  const codeBlockRegex = /```[\w-]*\n[\s\S]*?```/g
  let match
  let index = 0
  let lastEnd = 0
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const preceding = content.slice(lastEnd, match.index)
    result[index] = preceding
    lastEnd = codeBlockRegex.lastIndex
    index++
  }
  return result
}

export function FormattedMessage({ message, className, projectId, projectFiles, onFileSaved }: FormattedMessageProps) {
  const [copiedBlockIndex, setCopiedBlockIndex] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<{ blockIndex: number; path: string; filename: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [updatingBlockIndex, setUpdatingBlockIndex] = useState<number | null>(null)
  const [updateFileState, setUpdateFileState] = useState<{ blockIndex: number; path: string; filename: string } | null>(null)
  // Persist which code blocks were saved and their file path so the user can see "Saved: path/filename"
  const [savedBlocks, setSavedBlocks] = useState<Record<number, { path: string; filename: string; fileId?: string }>>({})
  const [updatedFileContent, setUpdatedFileContent] = useState<Record<number, string>>({})
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null)
  const [editCodeContent, setEditCodeContent] = useState('')
  const [renameState, setRenameState] = useState<{ blockIndex: number; path: string; filename: string } | null>(null)
  // Code blocks collapsed by default so the user lands at the top of GRIP's response with less scrolling
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<number, boolean>>({})

  // Extract code blocks, format content, and default path per block (from text before each block)
  const { formattedContent, codeBlocks, defaultPathByBlock } = useMemo(() => {
    if (!message.content) {
      return { formattedContent: '', codeBlocks: [], defaultPathByBlock: {} as Record<number, { path: string; filename: string } | null> }
    }
    let content = message.content
    if (!content.includes('```')) {
      return { formattedContent: content, codeBlocks: [], defaultPathByBlock: {} as Record<number, { path: string; filename: string } | null> }
    }
    // If response was truncated and left a code block unclosed, close it so we can parse and offer Save
    const backtickCount = (content.match(/```/g) || []).length
    if (backtickCount % 2 !== 0) {
      content = content.trimEnd() + '\n```'
    }
    
    const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g
    const codeBlocks: Array<{ language: string; code: string; placeholder: string }> = []
    
    // Add placeholders for code blocks
    let formattedContent = content.replace(codeBlockRegex, (match, language, code) => {
      const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`
      codeBlocks.push({
        language: language || 'plaintext',
        code: code.trim(),
        placeholder
      })
      return placeholder
    })
    const precedingByBlock = getPrecedingTextByBlock(content)
    const defaultPathByBlock: Record<number, { path: string; filename: string } | null> = {}
    for (let idx = 0; idx < codeBlocks.length; idx++) {
      defaultPathByBlock[idx] = parseFilePathFromPrecedingText(precedingByBlock[idx] ?? '') ?? null
    }
    return { formattedContent, codeBlocks, defaultPathByBlock }
  }, [message.content])

  // After refresh: derive savedBlocks from projectFiles so "Saved" shows without manual save state
  useEffect(() => {
    if (!projectFiles?.length || codeBlocks.length === 0) return
    const next: Record<number, { path: string; filename: string; fileId: string }> = {}
    for (let blockIndex = 0; blockIndex < codeBlocks.length; blockIndex++) {
      const def = defaultPathByBlock[blockIndex]
      const block = codeBlocks[blockIndex]
      const blockPath = (def?.path ?? '').trim()
      const blockFilename = (def?.filename ?? '').trim() || inferredFilenameForBlock(block?.language ?? '', block?.code ?? '')
      const file = projectFiles.find(
        (f) => (f.path || '').trim() === blockPath && (f.filename || '').trim() === blockFilename
      )
      if (file) next[blockIndex] = { path: file.path || '', filename: file.filename || '', fileId: file.id }
      // If no path was parsed, try matching by common filenames (e.g. package.json)
      if (!file && !blockFilename.startsWith('snippet.')) {
        const tryFilename = blockFilename || (codeBlocks[blockIndex]?.code?.trim().startsWith('{') ? 'package.json' : '')
        if (tryFilename) {
          const f2 = projectFiles.find((f) => (f.path || '').trim() === blockPath && (f.filename || '').trim() === tryFilename)
          if (f2) next[blockIndex] = { path: f2.path || '', filename: f2.filename || '', fileId: f2.id }
        }
      }
    }
    setSavedBlocks((prev) => ({ ...prev, ...next }))
  }, [projectFiles, codeBlocks, defaultPathByBlock])

  // Handle copy to clipboard (graceful when unsupported, e.g. non-HTTPS or older browsers)
  const copyToClipboard = (text: string, blockIndex: number) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      sonnerToast.error('Copy not supported', { description: 'Use a secure (HTTPS) connection or try selecting and copying manually.' })
      return
    }
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedBlockIndex(blockIndex)
        setTimeout(() => setCopiedBlockIndex(null), 2000)
      },
      (err) => {
        console.error('Could not copy text: ', err)
        sonnerToast.error('Copy failed', { description: 'Try selecting the text and copying manually.' })
      }
    )
  }
  
  const hasCodeBlocks = codeBlocks.length > 0

  return (
    <div className={cn('space-y-4 w-full', className)}>
      {/* Clarify: only code blocks are saved to project; plain text is not */}
      {hasCodeBlocks && projectId && (
        <p className="text-xs text-text-muted">
          Only code blocks (sections in triple backticks) can be saved to the project. Plain text in this message is not saved to files.
        </p>
      )}
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
          const showSaveForm = saveState?.blockIndex === blockIndex
          const savedInfo = savedBlocks[blockIndex]
          const isShellBlock = ['bash', 'sh', 'shell', 'zsh'].includes((block.language || '').toLowerCase())
          const isCollapsed = collapsedBlocks[blockIndex] !== false
          const lineCount = block.code.split(/\n/).length
          return (
            <div key={i} className="rounded-md overflow-hidden border border-border w-full max-w-full">
              <div className="bg-background-tertiary text-text-secondary px-3 py-1 text-xs flex flex-wrap justify-between items-center gap-2">
                <span className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-3 -ml-1 font-semibold border-primary/60 text-primary bg-primary/15 hover:bg-primary/25 hover:border-primary shadow-sm"
                    onClick={() => setCollapsedBlocks((prev) => ({ ...prev, [blockIndex]: prev[blockIndex] === false }))}
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronUp className="h-3.5 w-3.5 shrink-0" />}
                    <span className="ml-1">{isCollapsed ? 'Expand code' : 'Collapse code'}</span>
                  </Button>
                  {getLanguageLabel(block.language)}
                  {updatedFileContent[blockIndex] && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-success/15 text-success font-medium px-2 py-0.5" title="File was updated; see current state below">
                      <FileCheck className="h-3 w-3 shrink-0" />
                      File updated
                    </span>
                  )}
                  {isShellBlock && (
                    <span className="text-text-muted font-normal" title="Run this in the app terminal (Dashboard → Terminal)">
                      Run in app terminal
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {projectId && !isShellBlock && (
                    <>
                      {savedInfo ? (
                        <>
                          <span className="flex items-center gap-1.5 text-success font-medium" title={`Saved as ${savedFilePath(savedInfo.path, savedInfo.filename)}`}>
                            <FileCheck className="h-3.5 w-3.5 shrink-0" />
                            <span>Saved: {savedFilePath(savedInfo.path, savedInfo.filename)}</span>
                          </span>
                          {savedInfo.fileId && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20"
                                onClick={() => { setEditingBlockIndex(blockIndex); setEditCodeContent(block.code) }}
                              >
                                Edit code
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50"
                                disabled={updatingBlockIndex === blockIndex}
                                onClick={async () => {
                                  if (!projectId) return
                                  setUpdatingBlockIndex(blockIndex)
                                  try {
                                    const res = await fetch(`/api/projects/${projectId}/files/update-from-chat`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        path: savedInfo.path,
                                        filename: savedInfo.filename,
                                        newSnippet: block.code,
                                        language: block.language || 'plaintext',
                                      }),
                                    })
                                    const data = await res.json()
                                    if (!res.ok) throw new Error(data.error || 'Update failed')
                                    if (typeof data.content === 'string' && data.content) {
                                      setUpdatedFileContent((prev) => ({ ...prev, [blockIndex]: data.content }))
                                    }
                                    sonnerToast.success(data.action === 'merged' ? 'File updated (snippet merged)' : 'File updated', {
                                      description: savedFilePath(savedInfo.path, savedInfo.filename),
                                    })
                                    onFileSaved?.()
                                  } catch (e) {
                                    sonnerToast.error(e instanceof Error ? e.message : 'Update failed')
                                  } finally {
                                    setUpdatingBlockIndex(null)
                                  }
                                }}
                              >
                                {updatingBlockIndex === blockIndex ? <Loader2 className="h-3 w-3 animate-spin" /> : <FilePenLine className="h-3 w-3" />}
                                <span className="ml-1">Update file</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20"
                                onClick={() => setRenameState({ blockIndex, path: savedInfo.path, filename: savedInfo.filename })}
                              >
                                Rename
                              </Button>
                            </>
                          )}
                        </>
                      ) : showSaveForm ? (
                        <>
                          <Input
                            placeholder="folder path (e.g. src)"
                            value={saveState.path}
                            onChange={(e) => setSaveState((s) => s ? { ...s, path: e.target.value } : null)}
                            className="h-6 w-24 text-xs"
                          />
                          <Input
                            placeholder="filename (e.g. package.json)"
                            value={saveState.filename}
                            onChange={(e) => setSaveState((s) => s ? { ...s, filename: e.target.value } : null)}
                            className="h-6 w-28 text-xs"
                          />
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs px-3 font-semibold shadow-sm"
                            disabled={saving || !saveState.filename.trim()}
                            onClick={async () => {
                              if (!projectId || !saveState?.filename.trim()) return
                              setSaving(true)
                              try {
                                const res = await fetch(`/api/projects/${projectId}/files/save-from-chat`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    path: saveState.path.trim(),
                                    filename: saveState.filename.trim(),
                                    content: block.code,
                                    language: block.language || 'plaintext',
                                  }),
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error || 'Save failed')
                                const path = saveState.path.trim()
                                const filename = saveState.filename.trim()
                                const fileId = data.file?.id
                                if (fileId) setSavedBlocks((prev) => ({ ...prev, [blockIndex]: { path, filename, fileId } }))
                                setSaveState(null)
                                sonnerToast.success(data.action === 'updated' ? 'File updated' : 'Saved to project', {
                                  description: savedFilePath(path, filename),
                                })
                                onFileSaved?.()
                              } catch (e) {
                                sonnerToast.error(e instanceof Error ? e.message : 'Save failed')
                              } finally {
                                setSaving(false)
                              }
                            }}
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            <span className="ml-1">Save</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5 font-medium"
                            onClick={() => setSaveState(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : updateFileState?.blockIndex === blockIndex ? (
                        <>
                          <Input
                            placeholder="path (optional)"
                            value={updateFileState.path}
                            onChange={(e) => setUpdateFileState((s) => s ? { ...s, path: e.target.value } : null)}
                            className="h-6 w-24 text-xs"
                          />
                          <Input
                            placeholder="filename"
                            value={updateFileState.filename}
                            onChange={(e) => setUpdateFileState((s) => s ? { ...s, filename: e.target.value } : null)}
                            className="h-6 w-28 text-xs"
                          />
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs px-3 font-semibold shadow-sm"
                            disabled={saving || !updateFileState.filename.trim()}
                            onClick={async () => {
                              if (!projectId || !updateFileState?.filename.trim()) return
                              setSaving(true)
                              try {
                                const res = await fetch(`/api/projects/${projectId}/files/update-from-chat`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    path: updateFileState.path.trim(),
                                    filename: updateFileState.filename.trim(),
                                    newSnippet: block.code,
                                    language: block.language || 'plaintext',
                                  }),
                                })
                                const data = await res.json()
                                if (!res.ok) throw new Error(data.error || 'Update failed')
                                const path = updateFileState.path.trim()
                                const filename = updateFileState.filename.trim()
                                const fileId = data.file?.id
                                if (fileId) setSavedBlocks((prev) => ({ ...prev, [blockIndex]: { path, filename, fileId } }))
                                if (typeof data.content === 'string' && data.content) {
                                  setUpdatedFileContent((prev) => ({ ...prev, [blockIndex]: data.content }))
                                }
                                setUpdateFileState(null)
                                setUpdatingBlockIndex(null)
                                sonnerToast.success(data.action === 'merged' ? 'File updated (snippet merged)' : 'File created', {
                                  description: savedFilePath(path, filename),
                                })
                                onFileSaved?.()
                              } catch (e) {
                                sonnerToast.error(e instanceof Error ? e.message : 'Update failed')
                              } finally {
                                setSaving(false)
                              }
                            }}
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <FilePenLine className="h-3 w-3" />}
                            <span className="ml-1">Update and save</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5 font-medium"
                            onClick={() => { setUpdateFileState(null); setUpdatingBlockIndex(null) }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5 font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20"
                            onClick={() => {
                              const def = defaultPathByBlock[blockIndex]
                              setSaveState({
                                blockIndex,
                                path: def?.path ?? '',
                                filename: def?.filename ?? defaultFilenameFromLanguage(block.language),
                              })
                            }}
                          >
                            <Save className="h-3 w-3" />
                            <span className="ml-1">Save to project</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5 font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20"
                            onClick={() => {
                              const def = defaultPathByBlock[blockIndex]
                              setUpdateFileState({
                                blockIndex,
                                path: def?.path ?? '',
                                filename: def?.filename ?? inferredFilenameForBlock(block.language, block.code),
                              })
                            }}
                          >
                            <FilePenLine className="h-3 w-3" />
                            <span className="ml-1">Update file</span>
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20"
                    onClick={() => {
                      copyToClipboard(block.code, blockIndex)
                      if (isShellBlock) {
                        sonnerToast.info('Run in app terminal', {
                          description: 'Paste in the GRIP terminal (Dashboard → Terminal).',
                        })
                      }
                    }}
                  >
                    {copiedBlockIndex === blockIndex ? (
                      <>
                        <CheckIcon className="h-3 w-3" />
                        <span className="ml-1">Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-3 w-3" />
                        <span className="ml-1">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {isCollapsed ? (
                <div className="px-3 py-2 bg-muted/50 text-muted-foreground text-xs border-t border-border">
                  Code ({lineCount} line{lineCount !== 1 ? 's' : ''}) — expand above to view
                </div>
              ) : (
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
              )}
              {savedInfo && projectId && (
                <div className="px-3 py-2 bg-success/10 border-t border-border text-xs flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileCheck className="h-3.5 w-3.5 text-success shrink-0" />
                    <span className="font-semibold text-success">Automation complete</span>
                    <span className="text-text-muted">— file saved to project</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-text-secondary">
                      {updatedFileContent[blockIndex] ? (
                        <>
                          <span className="font-medium text-success">File contents updated.</span>
                          {' '}<code className="font-mono text-success">{savedFilePath(savedInfo.path, savedInfo.filename)}</code>
                        </>
                      ) : (
                        <code className="font-mono text-success">{savedFilePath(savedInfo.path, savedInfo.filename)}</code>
                      )}
                    </span>
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">Expand above to view code</span>
                  </div>
                  <Link
                    href={`/dashboard/projects/${projectId}#generated-files`}
                    className="inline-flex items-center gap-1 text-primary hover:underline w-fit"
                  >
                    View in Generated files
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
              {updatedFileContent[blockIndex] && (
                <div className="border-t border-border bg-primary/10 px-3 py-2">
                  <p className="text-xs font-medium text-primary">
                    File contents updated — the project file now has the merged code below. You can hide this section or run the project to verify.
                  </p>
                </div>
              )}
              {updatedFileContent[blockIndex] && (
                <div className="border-t border-border bg-muted/30">
                  <div className="px-3 py-1.5 text-xs flex items-center justify-between gap-2 border-b border-border/50">
                    <span className="font-medium text-text-secondary">Updated file (current state)</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5 font-medium border-border hover:bg-muted/50"
                      onClick={() => setUpdatedFileContent((prev) => { const next = { ...prev }; delete next[blockIndex]; return next })}
                    >
                      Hide
                    </Button>
                  </div>
                  <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                    <SyntaxHighlighter
                      language={mapLanguage(block.language)}
                      style={tomorrow}
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: '0.85rem',
                        backgroundColor: '#1e293b',
                        maxWidth: '100%',
                      }}
                      wrapLines
                      wrapLongLines
                    >
                      {updatedFileContent[blockIndex]}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
              {editingBlockIndex === blockIndex && savedInfo?.fileId && (
                <div className="px-3 py-2 border-t border-border bg-background-tertiary flex flex-col gap-2">
                  <span className="text-xs font-medium text-text-secondary">Edit code</span>
                  <textarea
                    value={editCodeContent}
                    onChange={(e) => setEditCodeContent(e.target.value)}
                    className="w-full min-h-[120px] rounded border border-border bg-background p-2 font-mono text-xs"
                    spellCheck={false}
                    aria-label="Edit file code"
                    title="Edit file code"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs font-semibold shadow-sm"
                      disabled={saving}
                      onClick={async () => {
                        if (!savedInfo?.fileId) return
                        setSaving(true)
                        try {
                          const res = await fetch(`/api/project-files/${savedInfo.fileId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: editCodeContent }),
                          })
                          if (!res.ok) throw new Error((await res.json()).error || 'Update failed')
                          sonnerToast.success('Code updated')
                          setEditingBlockIndex(null)
                          onFileSaved?.()
                        } catch (e) {
                          sonnerToast.error(e instanceof Error ? e.message : 'Update failed')
                        } finally {
                          setSaving(false)
                        }
                      }}
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      <span className="ml-1">Save</span>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs font-medium" onClick={() => { setEditingBlockIndex(null) }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {renameState?.blockIndex === blockIndex && savedInfo?.fileId && (
                <div className="px-3 py-2 border-t border-border bg-background-tertiary flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-text-secondary w-full">Rename file</span>
                  <Input
                    placeholder="path (optional)"
                    value={renameState.path}
                    onChange={(e) => setRenameState((s) => s ? { ...s, path: e.target.value } : null)}
                    className="h-7 w-28 text-xs"
                  />
                  <Input
                    placeholder="filename"
                    value={renameState.filename}
                    onChange={(e) => setRenameState((s) => s ? { ...s, filename: e.target.value } : null)}
                    className="h-7 w-32 text-xs"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs font-semibold shadow-sm"
                    disabled={saving || !renameState.filename.trim()}
                    onClick={async () => {
                      if (!savedInfo?.fileId || !renameState?.filename.trim()) return
                      setSaving(true)
                      try {
                        const res = await fetch(`/api/project-files/${savedInfo.fileId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            path: renameState.path.trim(),
                            filename: renameState.filename.trim(),
                          }),
                        })
                        if (!res.ok) throw new Error((await res.json()).error || 'Rename failed')
                        setSavedBlocks((prev) => ({
                          ...prev,
                          [blockIndex]: {
                            ...savedInfo,
                            path: renameState.path.trim(),
                            filename: renameState.filename.trim(),
                          },
                        }))
                        setRenameState(null)
                        sonnerToast.success('File renamed', { description: savedFilePath(renameState.path.trim(), renameState.filename.trim()) })
                      } catch (e) {
                        sonnerToast.error(e instanceof Error ? e.message : 'Rename failed')
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    <span className="ml-1">Save</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs font-medium" onClick={() => setRenameState(null)}>
                    Cancel
                  </Button>
                </div>
              )}
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