'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { FolderOpen, FileCode, ChevronRight, ChevronDown, Loader2, Save, Search, Sparkles, Layers, Pencil, Trash2, FolderMinus, FolderPlus, Copy, ClipboardPaste, Square, CheckSquare, ImageIcon } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'
import { cn } from '@/lib/utils'
import { isImagePath, getImageMimeType } from '@/lib/imageValidation'

function SummarizeButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/projects/${projectId}/repo/summarize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed')
          sonnerToast.success(data.message || `Summarized ${data.summarized} files`)
        } catch (e) {
          sonnerToast.error(e instanceof Error ? e.message : 'Summarize failed')
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      <span className="ml-1">Summarize for G.R.I.P.</span>
    </Button>
  )
}

/** Repo-only tree node */
interface RepoTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: RepoTreeNode[]
  size?: number
}
/** Project tree node (repo + generated): files may have source and fileId */
interface ProjectTreeNode extends RepoTreeNode {
  source?: 'repo' | 'generated' | 'both'
  fileId?: string
}

type ViewMode = 'repo' | 'project'

/** Indentation per depth level (rem) for proper nested folder display */
const INDENT_PER_LEVEL = 1.25

export default function ProjectRepoPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  const [viewMode, setViewMode] = useState<ViewMode>('project')
  const [tree, setTree] = useState<ProjectTreeNode[]>([])
  const [fileCount, setFileCount] = useState(0)
  const [generatedCount, setGeneratedCount] = useState(0)
  const [repo, setRepo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedFileSource, setSelectedFileSource] = useState<'repo' | 'generated' | 'both' | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editContent, setEditContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState<string[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'file' | 'folder'; path: string; fileId?: string } | null>(null)
  const [renamePath, setRenamePath] = useState<{ path: string; fileId?: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [newFolderPath, setNewFolderPath] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [createFolderInside, setCreateFolderInside] = useState<string | null>(null)
  const [newSubfolderName, setNewSubfolderName] = useState('')
  const [copiedFiles, setCopiedFiles] = useState<{ fullPath: string; content: string }[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [pasting, setPasting] = useState(false)

  useEffect(() => {
    if (!projectId) return
    const fetchTree = async () => {
      setLoading(true)
      setError(null)
      try {
        if (viewMode === 'project') {
          const res = await fetch(`/api/projects/${projectId}/project-tree`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to load project tree')
          setTree((data.tree || []) as ProjectTreeNode[])
          setFileCount(data.fileCount ?? 0)
          setGeneratedCount(data.generatedCount ?? 0)
          setRepo(data.repo || '')
        } else {
          const res = await fetch(`/api/projects/${projectId}/repo/tree`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Failed to load repo')
          setTree((data.tree || []) as ProjectTreeNode[])
          setFileCount(data.fileCount || 0)
          setGeneratedCount(0)
          setRepo(data.repo || '')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchTree()
  }, [projectId, viewMode])

  useEffect(() => {
    if (!projectId || !selectedPath) {
      setFileContent(null)
      setEditContent('')
      setIsEditing(false)
      return
    }
    setContentLoading(true)
    // Generated or both: fetch from project-files by fileId; else from repo
    if (selectedFileId && (selectedFileSource === 'generated' || selectedFileSource === 'both')) {
      fetch(`/api/project-files/${selectedFileId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.content != null) {
            setFileContent(data.content)
            setEditContent(data.content)
          } else {
            setFileContent('(empty)')
            setEditContent('')
          }
        })
        .catch(() => {
          setFileContent(null)
          setEditContent('')
        })
        .finally(() => setContentLoading(false))
    } else {
      fetch(`/api/projects/${projectId}/repo/files?path=${encodeURIComponent(selectedPath)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.content != null) {
            setFileContent(data.content)
            setEditContent(data.content)
          } else {
            setFileContent('(binary or empty)')
            setEditContent('')
          }
        })
        .catch(() => {
          setFileContent(null)
          setEditContent('')
        })
        .finally(() => setContentLoading(false))
    }
  }, [projectId, selectedPath, selectedFileId, selectedFileSource])

  useEffect(() => {
    if (!projectId || !searchQuery.trim()) {
      setSearchMatches([])
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/projects/${projectId}/repo/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.matches) setSearchMatches(data.matches.map((m: { path: string }) => m.path))
          else setSearchMatches([])
        })
        .catch(() => setSearchMatches([]))
    }, 300)
    return () => clearTimeout(t)
  }, [projectId, searchQuery])

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim() || searchMatches.length === 0) return tree
    const matchSet = new Set(searchMatches)
    function includeNode(node: RepoTreeNode): boolean {
      if (matchSet.has(node.path)) return true
      if (node.children) return node.children.some(includeNode)
      return false
    }
    function filterNode(node: RepoTreeNode): RepoTreeNode | null {
      if (node.type === 'file') return matchSet.has(node.path) ? node : null
      const filteredChildren = node.children?.map(filterNode).filter(Boolean) as RepoTreeNode[]
      if (filteredChildren.length > 0 || matchSet.has(node.path))
        return { ...node, children: filteredChildren.length ? filteredChildren : node.children }
      return null
    }
    return tree.map((n) => filterNode(n)).filter(Boolean) as RepoTreeNode[]
  }, [tree, searchQuery, searchMatches])

  const pathToNode = useMemo(() => {
    const map = new Map<string, ProjectTreeNode>()
    function walk(nodes: RepoTreeNode[]) {
      for (const n of nodes) {
        if (n.type === 'file') map.set(n.path, n as ProjectTreeNode)
        if (n.children?.length) walk(n.children)
      }
    }
    walk(searchQuery.trim() ? filteredTree : tree)
    return map
  }, [tree, filteredTree, searchQuery])

  const fetchFileContent = async (path: string, fileId?: string | null): Promise<string | null> => {
    if (!projectId) return null
    if (selectedPath === path && fileContent != null && fileContent !== '(binary or empty)') return fileContent
    try {
      if (fileId && (viewMode === 'project')) {
        const res = await fetch(`/api/project-files/${fileId}`)
        const data = await res.json()
        return typeof data.content === 'string' ? data.content : null
      }
      const res = await fetch(`/api/projects/${projectId}/repo/files?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      return typeof data.content === 'string' ? data.content : null
    } catch {
      return null
    }
  }

  const handleCopyFile = async (node: ProjectTreeNode) => {
    if (node.type !== 'file') return
    const content = await fetchFileContent(node.path, node.fileId)
    if (content == null) {
      sonnerToast.error('Could not load file', { description: node.path })
      return
    }
    setCopiedFiles((prev) => {
      const next = [...prev]
      const idx = next.findIndex((f) => f.fullPath === node.path)
      if (idx >= 0) next[idx] = { fullPath: node.path, content }
      else next.push({ fullPath: node.path, content })
      return next
    })
    sonnerToast.success('File added to clipboard', { description: 'Paste into a folder to copy.' })
  }

  const handleCopySelected = async () => {
    if (selectedPaths.size === 0) return
    const nodes = Array.from(selectedPaths).map((p) => pathToNode.get(p)).filter(Boolean) as ProjectTreeNode[]
    const added: { fullPath: string; content: string }[] = []
    for (const node of nodes) {
      const content = await fetchFileContent(node.path, node.fileId)
      if (content != null) added.push({ fullPath: node.path, content })
    }
    if (added.length === 0) {
      sonnerToast.error('Could not load selected files')
      return
    }
    setCopiedFiles((prev) => {
      const byPath = new Map(prev.map((f) => [f.fullPath, f]))
      added.forEach((f) => byPath.set(f.fullPath, f))
      return Array.from(byPath.values())
    })
    sonnerToast.success(`${added.length} file(s) added to clipboard`, { description: 'Paste into a folder to copy.' })
  }

  const handlePasteIntoFolder = async (targetPath: string) => {
    if (!projectId || copiedFiles.length === 0 || pasting) return
    setPasting(true)
    try {
      let ok = 0
      for (const { fullPath, content } of copiedFiles) {
        const filename = fullPath.includes('/') ? fullPath.slice(fullPath.lastIndexOf('/') + 1) : fullPath
        const path = targetPath.replace(/\/+$/, '')
        const res = await fetch(`/api/projects/${projectId}/files/save-from-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, filename, content }),
        })
        const data = await res.json()
        if (res.ok) ok++
      }
      sonnerToast.success(`${ok} file(s) pasted`, { description: targetPath ? `Into ${targetPath}` : 'At project root' })
      setTree([])
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/project-tree`)
      const data = await res.json()
      if (res.ok) {
        setTree((data.tree || []) as ProjectTreeNode[])
        setFileCount(data.fileCount ?? 0)
        setGeneratedCount(data.generatedCount ?? 0)
      }
      setLoading(false)
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Paste failed')
    } finally {
      setPasting(false)
    }
  }

  const toggleFileSelection = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleSave = async () => {
    if (!projectId || !selectedPath || saving) return
    setSaving(true)
    try {
      if (selectedFileId && (selectedFileSource === 'generated' || selectedFileSource === 'both')) {
        const res = await fetch(`/api/project-files/${selectedFileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editContent }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save')
        setFileContent(editContent)
        setIsEditing(false)
        sonnerToast.success('Saved', { description: `${selectedPath} updated.` })
      } else {
        const res = await fetch(`/api/projects/${projectId}/repo/files`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: selectedPath, content: editContent }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to save')
        setFileContent(editContent)
        setIsEditing(false)
        sonnerToast.success('Saved', { description: `${selectedPath} updated.` })
      }
    } catch (e) {
      sonnerToast.error('Error', { description: e instanceof Error ? e.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleDeleteFile = async (path: string, fileId?: string) => {
    if (!projectId || actionLoading) return
    setActionLoading(true)
    try {
      if (fileId && (viewMode === 'project')) {
        const res = await fetch(`/api/project-files/${fileId}`, { method: 'DELETE' })
        if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
        sonnerToast.success('File deleted')
      } else {
        const res = await fetch(`/api/projects/${projectId}/repo/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
        if (!res.ok) throw new Error((await res.json()).error || 'Delete failed')
        sonnerToast.success('File removed from repo cache')
      }
      setDeleteConfirm(null)
      if (selectedPath === path) setSelectedPath(null)
      setLoading(true)
      const url = viewMode === 'project' ? `/api/projects/${projectId}/project-tree` : `/api/projects/${projectId}/repo/tree`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setTree((data.tree || []) as ProjectTreeNode[])
        setFileCount(data.fileCount ?? 0)
        setGeneratedCount(data.generatedCount ?? 0)
      }
      setLoading(false)
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!projectId || actionLoading) return
    setActionLoading(true)
    try {
      if (viewMode === 'project') {
        const [repoRes, filesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/repo/folder?path=${encodeURIComponent(folderPath)}`, { method: 'DELETE' }),
          fetch(`/api/projects/${projectId}/files/folder?path=${encodeURIComponent(folderPath)}`, { method: 'DELETE' }),
        ])
        const repoData = await repoRes.json()
        const filesData = await filesRes.json()
        if (!repoRes.ok && !filesRes.ok) throw new Error(repoData.error || filesData.error || 'Delete failed')
        const total = (repoData.removed ?? 0) + (filesData.deleted ?? 0)
        sonnerToast.success(`Folder removed (${total} items)`)
      } else {
        const res = await fetch(`/api/projects/${projectId}/repo/folder?path=${encodeURIComponent(folderPath)}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Delete failed')
        sonnerToast.success(`Folder removed (${data.removed ?? 0} files)`)
      }
      setDeleteConfirm(null)
      setTree([])
      setLoading(true)
      const url = viewMode === 'project' ? `/api/projects/${projectId}/project-tree` : `/api/projects/${projectId}/repo/tree`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setTree((data.tree || []) as ProjectTreeNode[])
        setFileCount(data.fileCount ?? 0)
        setGeneratedCount(data.generatedCount ?? 0)
      }
      setLoading(false)
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateFolder = async (path: string) => {
    if (!projectId || actionLoading || !path.trim()) return
    const folderPath = path.trim().replace(/^\/+|\/+$/g, '')
    if (!folderPath) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/files/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create folder')
      sonnerToast.success('Folder created', { description: folderPath })
      setShowNewFolder(false)
      setNewFolderPath('')
      setCreateFolderInside(null)
      setNewSubfolderName('')
      setTree([])
      setLoading(true)
      const url = viewMode === 'project' ? `/api/projects/${projectId}/project-tree` : `/api/projects/${projectId}/repo/tree`
      const treeRes = await fetch(url)
      const treeData = await treeRes.json()
      if (treeRes.ok) {
        setTree((treeData.tree || []) as ProjectTreeNode[])
        setFileCount(treeData.fileCount ?? 0)
        setGeneratedCount(treeData.generatedCount ?? 0)
      }
      setExpanded((prev) => {
        const next = new Set(prev)
        folderPath.split('/').reduce((p, part) => {
          const full = p ? `${p}/${part}` : part
          next.add(full)
          return full
        }, '')
        return next
      })
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Failed to create folder')
    } finally {
      setActionLoading(false)
      setLoading(false)
    }
  }

  const handleCopyContent = async () => {
    const text = isEditing ? editContent : (fileContent ?? '')
    if (text === '' || text === '(binary or empty)') return
    try {
      await navigator.clipboard.writeText(text)
      sonnerToast.success('Copied to clipboard', { description: 'Paste into another file or editor.' })
    } catch {
      sonnerToast.error('Could not copy')
    }
  }

  const handleRenameFile = async () => {
    if (!projectId || !renamePath || !renameValue.trim() || actionLoading) return
    const newPath = renameValue.trim()
    setActionLoading(true)
    try {
      if (renamePath.fileId && viewMode === 'project') {
        const lastSlash = newPath.lastIndexOf('/')
        const path = lastSlash >= 0 ? newPath.slice(0, lastSlash) : ''
        const filename = lastSlash >= 0 ? newPath.slice(lastSlash + 1) : newPath
        const res = await fetch(`/api/project-files/${renamePath.fileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, filename }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Rename failed')
        sonnerToast.success('File renamed')
      } else {
        const res = await fetch(`/api/projects/${projectId}/repo/files`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: renamePath.path, newPath }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Rename failed')
        sonnerToast.success('File renamed')
      }
      setRenamePath(null)
      setRenameValue('')
      setTree([])
      setLoading(true)
      const url = viewMode === 'project' ? `/api/projects/${projectId}/project-tree` : `/api/projects/${projectId}/repo/tree`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setTree((data.tree || []) as ProjectTreeNode[])
        setFileCount(data.fileCount ?? 0)
        setGeneratedCount(data.generatedCount ?? 0)
      }
      setLoading(false)
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Rename failed')
    } finally {
      setActionLoading(false)
    }
  }

  const renderNode = (node: RepoTreeNode, depth: number) => {
    const isDir = node.type === 'dir'
    const isExpanded = expanded.has(node.path)

    if (isDir) {
      return (
        <div key={node.path} className="select-none group">
          <div
            className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-background-tertiary min-w-0"
            style={{ paddingLeft: `calc(0.5rem + ${depth * INDENT_PER_LEVEL}rem)` }}
          >
            <button
              type="button"
              onClick={() => toggleExpand(node.path)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
              )}
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="truncate">{node.name}</span>
            </button>
            {viewMode === 'project' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCreateFolderInside(createFolderInside === node.path ? null : node.path)
                  setNewSubfolderName('')
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-text-muted shrink-0"
                title="Create folder inside"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            )}
            {viewMode === 'project' && copiedFiles.length > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePasteIntoFolder(node.path); }}
                disabled={pasting}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-text-muted shrink-0 flex items-center gap-0.5"
                title={`Paste ${copiedFiles.length} file(s) here`}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                {copiedFiles.length > 1 && <span className="text-[10px]">{copiedFiles.length}</span>}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'folder', path: node.path }); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-destructive shrink-0"
              title="Delete folder and contents"
            >
              <FolderMinus className="h-3.5 w-3.5" />
            </button>
          </div>
          {createFolderInside === node.path && viewMode === 'project' && (
            <div className="flex items-center gap-2 py-1 px-2 rounded bg-muted/50 ml-6" style={{ paddingLeft: `calc(0.5rem + ${(depth + 1) * INDENT_PER_LEVEL}rem)` }}>
              <Input
                placeholder="New folder name"
                value={newSubfolderName}
                onChange={(e) => setNewSubfolderName(e.target.value)}
                className="h-7 text-xs font-mono flex-1 min-w-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder(`${node.path}/${newSubfolderName.trim()}`)
                  if (e.key === 'Escape') { setCreateFolderInside(null); setNewSubfolderName('') }
                }}
              />
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleCreateFolder(`${node.path}/${newSubfolderName.trim()}`)} disabled={!newSubfolderName.trim() || actionLoading}>
                Create
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setCreateFolderInside(null); setNewSubfolderName('') }}>Cancel</Button>
            </div>
          )}
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    const projNode = node as ProjectTreeNode
    const isGenerated = projNode.source === 'generated' || projNode.source === 'both'
    const fullPath = node.path
    return (
      <div
        key={node.path}
        className={cn(
          'group flex items-center gap-2 w-full text-left py-1 px-2 rounded min-w-0',
          selectedPath === node.path ? 'bg-primary/20 text-primary' : 'hover:bg-background-tertiary'
        )}
        style={{ paddingLeft: `calc(0.5rem + ${depth * INDENT_PER_LEVEL}rem)` }}
      >
        {viewMode === 'project' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleFileSelection(fullPath); }}
            className="p-0.5 rounded hover:bg-muted shrink-0"
            title={selectedPaths.has(fullPath) ? 'Deselect' : 'Select for copy'}
          >
            {selectedPaths.has(fullPath) ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5 text-text-muted" />}
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => {
            setSelectedPath(node.path)
            setSelectedFileSource(projNode.source ?? null)
            setSelectedFileId(projNode.fileId ?? null)
          }}
        >
          <span className="w-4 shrink-0" />
          <FileCode className="h-4 w-4 shrink-0 text-text-secondary" />
          <span className="truncate">{node.name}</span>
        </button>
        {isGenerated && (
          <span className="text-[10px] px-1.5 py-0 rounded bg-success/20 text-success shrink-0" title="Your file (saved from chat or generated)">
            Yours
          </span>
        )}
        {node.size != null && (
          <span className="text-xs text-text-muted shrink-0">
            {(node.size / 1024).toFixed(1)}k
          </span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCopyFile(projNode); }}
            className="p-1 rounded hover:bg-muted text-text-muted"
            title="Copy file (add to clipboard for paste into folder)"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setRenamePath({ path: fullPath, fileId: projNode.fileId }); setRenameValue(fullPath); }}
            className="p-1 rounded hover:bg-muted text-text-muted"
            title="Rename file"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'file', path: fullPath, fileId: projNode.fileId }); }}
            className="p-1 rounded hover:bg-destructive/20 text-destructive"
            title="Delete file"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Repo Explorer</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-md border border-border p-0.5 bg-background-tertiary">
            <button
              type="button"
              onClick={() => setViewMode('project')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded',
                viewMode === 'project' ? 'bg-background text-foreground shadow' : 'text-text-secondary hover:text-foreground'
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              Project (repo + yours)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('repo')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded',
                viewMode === 'repo' ? 'bg-background text-foreground shadow' : 'text-text-secondary hover:text-foreground'
              )}
            >
              Repo only
            </button>
          </div>
          {repo && (
            <span className="text-sm text-text-secondary">
              {repo}
              {viewMode === 'project' && generatedCount > 0 ? ` · ${fileCount} repo + ${generatedCount} yours` : ` · ${fileCount} file${fileCount !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-text-secondary">
        {viewMode === 'project'
          ? 'One tree: linked repo + your generated files (saved from chat or Plan). Same folder structure; your files override where paths match. No restructuring—you keep ownership of your additions.'
          : 'Every folder and file in your linked GitHub repo. Click a file to view or edit. Search by path or content.'}
      </p>

      {!loading && !error && tree.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Search by path or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <SummarizeButton projectId={projectId} />
        </div>
      )}

      {loading ? (
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading full repo...</span>
        </Card>
      ) : error ? (
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <p className="text-destructive">{error}</p>
          <p className="text-sm text-text-secondary mt-2">
            {viewMode === 'project'
              ? 'Link a GitHub repository in project settings or save code from chat (Develop) to see files here.'
              : 'Link a GitHub repository in project settings, then return here.'}
          </p>
        </Card>
      ) : tree.length === 0 ? (
        <Card className="p-6 border-border">
          <p className="text-text-secondary">
            {viewMode === 'project'
              ? 'No repo or generated files yet. Link a repo in settings or save code from chat (Develop) to build your project tree.'
              : 'No files in repository yet. Clone or refresh the repo.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {(deleteConfirm || renamePath) && (
            <Card className="p-4 border-primary/30 bg-primary/5">
              {deleteConfirm && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">
                    {deleteConfirm.type === 'folder'
                      ? `Delete folder "${deleteConfirm.path}" and all its contents? This cannot be undone.`
                      : `Delete file "${deleteConfirm.path}"? This cannot be undone.`}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={() =>
                      deleteConfirm.type === 'folder'
                        ? handleDeleteFolder(deleteConfirm.path)
                        : handleDeleteFile(deleteConfirm.path, deleteConfirm.fileId)
                    }
                  >
                    {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    <span className="ml-1">Delete</span>
                  </Button>
                  <Button size="sm" variant="ghost" disabled={actionLoading} onClick={() => setDeleteConfirm(null)}>
                    Cancel
                  </Button>
                </div>
              )}
              {renamePath && !deleteConfirm && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-text-secondary">Rename to:</span>
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="path/filename"
                    className="flex-1 min-w-[200px] font-mono text-sm"
                  />
                  <Button size="sm" disabled={actionLoading || !renameValue.trim()} onClick={handleRenameFile}>
                    {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
                    <span className="ml-1">Save</span>
                  </Button>
                  <Button size="sm" variant="ghost" disabled={actionLoading} onClick={() => { setRenamePath(null); setRenameValue(''); }}>
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 max-h-[70vh] overflow-y-auto min-w-0">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Files & folders</h3>
            <p className="text-xs text-text-muted mb-2">Hover a file for Copy/Rename/Delete; use checkboxes to select multiple, then Copy selected. Hover a folder for Paste / New folder / Delete.</p>
            {viewMode === 'project' && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewFolder((v) => !v)} className="gap-1">
                  <FolderPlus className="h-3.5 w-3.5" />
                  New folder
                </Button>
                {selectedPaths.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCopySelected} className="gap-1">
                      <Copy className="h-3.5 w-3.5" />
                      Copy selected ({selectedPaths.size})
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPaths(new Set())} className="text-xs">
                      Clear selection
                    </Button>
                  </>
                )}
                {copiedFiles.length > 0 && (
                  <>
                    <span className="text-xs text-text-muted">Clipboard: {copiedFiles.length} file(s)</span>
                    <Button variant="outline" size="sm" onClick={() => handlePasteIntoFolder('')} disabled={pasting} className="gap-1">
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      Paste at root
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCopiedFiles([])} className="text-xs">
                      Clear clipboard
                    </Button>
                  </>
                )}
                {showNewFolder && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      placeholder="e.g. public/images"
                      value={newFolderPath}
                      onChange={(e) => setNewFolderPath(e.target.value)}
                      className="h-8 text-xs font-mono flex-1 max-w-[220px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder(newFolderPath)
                        if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderPath('') }
                      }}
                    />
                    <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => handleCreateFolder(newFolderPath)} disabled={!newFolderPath.trim() || actionLoading}>
                      Create
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowNewFolder(false); setNewFolderPath('') }}>Cancel</Button>
                  </div>
                )}
              </div>
            )}
            <div className="font-mono text-sm">
              {(searchQuery.trim() ? filteredTree : tree).map((node) => renderNode(node, 0))}
            </div>
          </Card>
          <Card className="p-4 min-h-[300px] flex flex-col min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <h3 className="text-sm font-medium text-text-secondary truncate">
                {selectedPath ? selectedPath : 'Select a file'}
              </h3>
              {selectedPath && fileContent != null && fileContent !== '(binary or empty)' && (
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handleCopyContent} title="Copy content to paste in another file">
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span className="ml-1">Save</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditContent(fileContent); }}>
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto rounded bg-background-tertiary p-4 font-mono text-sm whitespace-pre-wrap break-words min-h-0">
              {contentLoading ? (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : isEditing && selectedPath ? (
                <textarea
                  className="w-full h-full min-h-[280px] rounded bg-background-primary border border-border p-2 font-mono text-xs text-text-primary resize-y"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  spellCheck={false}
                  aria-label="Edit file content"
                  title="Edit file content"
                />
              ) : fileContent != null ? (
                selectedPath && isImagePath(selectedPath) && fileContent !== '(binary or empty)' && fileContent.trim().length > 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 min-h-[200px]">
                    <img
                      src={`data:${getImageMimeType(selectedPath)};base64,${fileContent}`}
                      alt={selectedPath}
                      className="max-w-full max-h-[60vh] object-contain rounded border border-border"
                    />
                    <span className="text-xs text-text-muted">Image file · base64 content used in export/StackBlitz</span>
                  </div>
                ) : selectedPath && isImagePath(selectedPath) && (fileContent === '(binary or empty)' || !fileContent?.trim()) ? (
                  <div className="flex flex-col items-center justify-center gap-2 min-h-[200px] text-text-muted">
                    <ImageIcon className="h-12 w-12 opacity-50" />
                    <span className="text-sm">Image file (content not loaded)</span>
                  </div>
                ) : (
                  <pre className="m-0 text-xs">{fileContent}</pre>
                )
              ) : (
                <span className="text-text-muted">Click a file in the tree to view its content.</span>
              )}
            </div>
          </Card>
          </div>
        </div>
      )}
    </div>
  )
}
