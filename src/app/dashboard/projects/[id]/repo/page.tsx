'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { FolderOpen, FileCode, ChevronRight, ChevronDown, Loader2, Save, Search, Sparkles } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'

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

interface RepoTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: RepoTreeNode[]
  size?: number
}

export default function ProjectRepoPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  const [tree, setTree] = useState<RepoTreeNode[]>([])
  const [fileCount, setFileCount] = useState(0)
  const [repo, setRepo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editContent, setEditContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatches, setSearchMatches] = useState<string[]>([])

  useEffect(() => {
    if (!projectId) return
    const fetchTree = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/projects/${projectId}/repo/tree`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load repo')
        setTree(data.tree || [])
        setFileCount(data.fileCount || 0)
        setRepo(data.repo || '')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load repo')
      } finally {
        setLoading(false)
      }
    }
    fetchTree()
  }, [projectId])

  useEffect(() => {
    if (!projectId || !selectedPath) {
      setFileContent(null)
      setEditContent('')
      setIsEditing(false)
      return
    }
    setContentLoading(true)
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
  }, [projectId, selectedPath])

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

  const handleSave = async () => {
    if (!projectId || !selectedPath || saving) return
    setSaving(true)
    try {
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

  const renderNode = (node: RepoTreeNode, depth: number) => {
    const isDir = node.type === 'dir'
    const isExpanded = expanded.has(node.path)

    if (isDir) {
      return (
        <div key={node.path} className="select-none">
          <button
            type="button"
            onClick={() => toggleExpand(node.path)}
            className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-background-tertiary min-w-0 pl-2"
            style={{ paddingLeft: `calc(0.5rem + ${depth * 1}rem)` }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
            )}
            <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        type="button"
        key={node.path}
        onClick={() => setSelectedPath(node.path)}
        className={`flex items-center gap-2 w-full text-left py-1 px-2 rounded min-w-0 pl-2 ${selectedPath === node.path ? 'bg-primary/20 text-primary' : 'hover:bg-background-tertiary'}`}
        style={{ paddingLeft: `calc(0.5rem + ${depth * 1}rem)` }}
      >
        <span className="w-4 shrink-0" />
        <FileCode className="h-4 w-4 shrink-0 text-text-secondary" />
        <span className="truncate">{node.name}</span>
        {node.size != null && (
          <span className="text-xs text-text-muted ml-auto shrink-0">
            {(node.size / 1024).toFixed(1)}k
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Repo Explorer</h2>
        {repo && (
          <span className="text-sm text-text-secondary">
            {repo} · {fileCount} file{fileCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <p className="text-sm text-text-secondary">
        Every folder and file in your linked GitHub repo. Click a file to view or edit. Search by path or content.
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
            Link a GitHub repository in project settings, then return here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 max-h-[70vh] overflow-y-auto min-w-0">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Files & folders</h3>
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
                <div className="flex gap-2">
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
                <pre className="m-0 text-xs">{fileContent}</pre>
              ) : (
                <span className="text-text-muted">Click a file in the tree to view its content.</span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
