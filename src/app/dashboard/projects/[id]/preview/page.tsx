'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { ExternalLink, Loader2, Play, Download, Github, ChevronDown, ChevronUp, Zap, MessageSquare } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'
import { openInStackBlitz } from '@/lib/stackblitzOpen'

export default function ProjectPreviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params?.id || ''
  const [showGitHubSteps, setShowGitHubSteps] = useState(false)
  const [project, setProject] = useState<{
    title?: string
    repository?: { owner: string; name: string }
    exportedRepoUrl?: string
    deployedUrl?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState('')
  const [stackblitzLoading, setStackblitzLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [deployLoading, setDeployLoading] = useState(false)
  const [showDeployFaq, setShowDeployFaq] = useState(false)
  const [preflightErrors, setPreflightErrors] = useState<string[] | null>(null)
  const [preflightSuggestions, setPreflightSuggestions] = useState<string[]>([])
  const [showReportErrors, setShowReportErrors] = useState(false)
  const [runErrorsRaw, setRunErrorsRaw] = useState('')
  const [runErrorsSubmitting, setRunErrorsSubmitting] = useState(false)

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data)
        if (data?.deployedUrl) setPreviewUrl((u) => u || data.deployedUrl)
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }, [projectId])

  // Run in browser: preflight first, then send project files to StackBlitz (not the cloned repo)
  const handleRunInBrowser = async () => {
    if (!projectId) return
    setStackblitzLoading(true)
    setPreflightErrors(null)
    setPreflightSuggestions([])
    try {
      const result = await openInStackBlitz(projectId, { newWindow: false })
      setStackblitzLoading(false)
      if (!result.ok) {
        if (result.preflightErrors?.length) {
          setPreflightErrors(result.preflightErrors)
          setPreflightSuggestions(result.preflightSuggestions ?? [])
        }
        sonnerToast.error(result.error)
        return
      }
      sonnerToast.success('Opening StackBlitz', { description: 'You’ll be taken to StackBlitz to run the project.' })
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Failed to open in StackBlitz')
    } finally {
      setStackblitzLoading(false)
    }
  }

  // Download project as ZIP
  const handleDownload = async () => {
    if (!projectId) return
    setDownloadLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/download`, { credentials: 'include' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Download failed')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const filename = match?.[1] || `${project?.title || 'grip-project'}.zip`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      sonnerToast.success('Download started', { description: filename })
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloadLoading(false)
    }
  }

  // Export to GitHub (create new repo)
  const handleExportToGitHub = async () => {
    if (!projectId) return
    setExportLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: (project?.title || 'grip-project').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase().slice(0, 50),
          description: project?.title || 'Exported from G.R.I.P.',
          private: true,
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.error || 'Export failed'
        if (res.status === 503) {
          const hint = (data as { hint?: string }).hint
          sonnerToast.error(msg, {
            description: hint ?? 'Add your GitHub token in Dashboard → Settings so the export uses your account.',
            action: { label: 'Open Settings', onClick: () => router.push('/dashboard/settings') },
          })
        } else {
          sonnerToast.error(msg)
        }
        throw new Error(msg)
      }
      sonnerToast.success('Repo created', { description: data.repoUrl })
      setProject((p) => (p ? { ...p, exportedRepoUrl: data.repoUrl } : null))
      if (data.repoUrl) window.open(data.repoUrl, '_blank')
    } catch (e) {
      if (e instanceof Error && e.message !== 'Export failed') sonnerToast.error(e.message)
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeploy = async () => {
    if (!projectId || deployLoading) return
    setDeployLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deploy failed')
      sonnerToast.success('Deployment started', { description: data.message || data.url })
      setProject((p) => (p && data.url ? { ...p, deployedUrl: data.url } : p))
      if (data.url) setPreviewUrl((u) => u || data.url)
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Deploy failed')
    } finally {
      setDeployLoading(false)
    }
  }

  const hasRepo = !!(project?.repository?.owner && project?.repository?.name) || !!project?.exportedRepoUrl

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Preview — get your app into your hands</h2>
        <p className="text-sm text-text-secondary mt-1">
          Run it in the browser, download it, or create a new GitHub repo and deploy. No terminal required for the first two.
        </p>
      </div>

      {loading ? (
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading project...</span>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* 1. Run in browser (StackBlitz in new tab so GRIP stays open here) */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Run in browser</CardTitle>
              <CardDescription>
                One click. No install. StackBlitz opens in a <strong>new tab</strong> so this GRIP tab stays open—no back button, and you can copy errors from StackBlitz and paste them here to send to GRIP. No terminal, no GitHub.
                Expo/React Native: If the preview shows JSON (manifest) instead of the app, the web server may be starting—wait a moment, or in StackBlitz press <strong>w</strong> in the terminal to open the web version.
                If you see a white screen or &quot;RuntimeError: memory access out of bounds&quot; (Metro + StackBlitz), that&apos;s a known StackBlitz/WebContainers limitation—use <strong>Download project</strong> or <strong>Export to GitHub</strong> and run locally (<code className="text-xs">npm run dev</code>) instead.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {preflightErrors && preflightErrors.length > 0 && (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Project not ready for StackBlitz</p>
                  <ul className="text-sm text-amber-800 dark:text-amber-300 list-disc list-inside space-y-0.5">
                    {preflightErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  {preflightSuggestions.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">{preflightSuggestions[0]}</p>
                  )}
                  <Link href={`/dashboard/projects/${projectId}/enhanced-chat`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Fix in Develop (GRIP will see these issues and help)
                    </Button>
                  </Link>
                </div>
              )}
              <Button
                variant="default"
                className="gap-2"
                onClick={() => {
                  const url = `/dashboard/projects/${projectId}/open-stackblitz`
                  window.open(url, '_blank', 'noopener,noreferrer')
                  sonnerToast.success('Opening StackBlitz in new tab', { description: 'GRIP stays open here — copy errors from StackBlitz and paste below to send to GRIP.' })
                }}
              >
                <Play className="h-4 w-4" />
                Run in StackBlitz
              </Button>
              <button
                type="button"
                onClick={() => setShowReportErrors((v) => !v)}
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
              >
                {showReportErrors ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                I saw errors in StackBlitz — paste them here and send to GRIP (this tab stays open)
              </button>
              {showReportErrors && (
                <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 mt-2">
                  <p className="text-xs text-text-secondary">
                    This tab is GRIP—StackBlitz is in the other tab. Copy errors from StackBlitz, paste below, then send to GRIP. GRIP will see them in Develop and suggest file changes.
                  </p>
                  <textarea
                    value={runErrorsRaw}
                    onChange={(e) => setRunErrorsRaw(e.target.value)}
                    placeholder="Paste terminal output, e.g.: ERROR in ./src/engine/GameEngine.ts:434:28&#10;Syntax error: Unexpected token"
                    className="w-full min-h-[120px] rounded border border-border bg-background px-2 py-1.5 text-sm font-mono"
                    rows={5}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={!runErrorsRaw.trim() || runErrorsSubmitting}
                      onClick={async () => {
                        if (!projectId || !runErrorsRaw.trim()) return
                        setRunErrorsSubmitting(true)
                        try {
                          const res = await fetch(`/api/projects/${projectId}/run-errors`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ source: 'stackblitz', raw: runErrorsRaw.trim() }),
                            credentials: 'include',
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error || 'Failed to send errors')
                          sonnerToast.success('Errors sent to GRIP', { description: 'Opening Develop — GRIP will respond to the errors.' })
                          setRunErrorsRaw('')
                          setShowReportErrors(false)
                          router.push(`/dashboard/projects/${projectId}/enhanced-chat?stackblitzErrorsSubmitted=1`)
                        } catch (e) {
                          sonnerToast.error(e instanceof Error ? e.message : 'Failed to send errors')
                        } finally {
                          setRunErrorsSubmitting(false)
                        }
                      }}
                    >
                      {runErrorsSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      Send to GRIP and open Develop
                    </Button>
                    <Link href={`/dashboard/projects/${projectId}/enhanced-chat`}>
                      <Button variant="outline" size="sm">Open Develop only</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Download project */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Download project</CardTitle>
              <CardDescription>
                Get every file in one ZIP. No GitHub or terminal needed. Open the folder, send it to a dev, or use it elsewhere.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDownload}
                disabled={downloadLoading}
              >
                {downloadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download project (ZIP)
              </Button>
            </CardContent>
          </Card>

          {/* 3. Export to GitHub (create new repo) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export to GitHub</CardTitle>
              <CardDescription>
                Create a new GitHub repo with your project files. Then you can deploy to Vercel or share the link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExportToGitHub}
                disabled={exportLoading}
              >
                {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                Create new repo on GitHub
              </Button>
              <button
                type="button"
                onClick={() => setShowGitHubSteps(!showGitHubSteps)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {showGitHubSteps ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                How to get your project on GitHub (devs & non-devs)
              </button>
              {showGitHubSteps && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-text-secondary space-y-2">
                  <p className="font-medium text-text-primary">Non-devs (no GitHub account yet)</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Create a free account at <a href="https://github.com/join" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/join</a>.</li>
                    <li>Create a Personal Access Token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic). Check the <strong>repo</strong> scope.</li>
                    <li>In GRIP: <Link href="/dashboard/settings" className="text-primary hover:underline">Dashboard → Settings</Link>, add your GitHub token (or ask your admin to set GITHUB_TOKEN in server env).</li>
                    <li>Return here and click &quot;Create new repo on GitHub&quot;.</li>
                  </ol>
                  <p className="font-medium text-text-primary pt-1">Devs (already have GitHub)</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Ensure you have a token with <strong>repo</strong> scope: <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/settings/tokens</a>.</li>
                    <li>In GRIP: <Link href="/dashboard/settings" className="text-primary hover:underline">Dashboard → Settings</Link>, add your GitHub token if not already set.</li>
                    <li>Click &quot;Create new repo on GitHub&quot; above.</li>
                  </ol>
                </div>
              )}
              {project?.exportedRepoUrl && (
                <p className="text-xs text-text-muted mt-2">
                  Repo: <a href={project.exportedRepoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{project.exportedRepoUrl}</a>
                </p>
              )}
            </CardContent>
          </Card>

          {/* 4. Deploy to Vercel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deploy to Vercel</CardTitle>
              <CardDescription>
                Publish your app to a live URL. The project must have a GitHub repo (link one in Settings or use Export to GitHub above). The repo must be imported in Vercel once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDeploy}
                disabled={deployLoading || !hasRepo}
              >
                {deployLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Deploy to Vercel
              </Button>
              {!hasRepo && (
                <p className="text-xs text-text-muted">
                  Link a repo in Project Settings or Export to GitHub first.
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowDeployFaq(!showDeployFaq)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                {showDeployFaq ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Deploy to Vercel – FAQs &amp; instructions (devs &amp; non-devs)
              </button>
              {showDeployFaq && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-text-secondary space-y-2">
                  <p className="font-medium text-text-primary">Flow</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Get the project on GitHub (Export to GitHub above or link a repo in Settings).</li>
                    <li>In Vercel: <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">vercel.com → Add New → Project</a> → Import the same GitHub repo (one-time per repo).</li>
                    <li>In GRIP: click Deploy to Vercel above. GRIP triggers a production deploy; when ready, the live URL appears here.</li>
                  </ol>
                  <p className="font-medium text-text-primary pt-1">FAQs</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>One GitHub token or per project?</strong> One token per user. Set it once in Dashboard → Settings (or Project → Settings); it’s used for Export to GitHub for all your projects.</li>
                    <li><strong>Button disabled?</strong> The project needs a GitHub repo. Export to GitHub first or link a repo in Project Settings.</li>
                    <li><strong>Deploy failed?</strong> Import the repo in Vercel first (step 2). If it still fails, the server may need VERCEL_TOKEN (ask your admin).</li>
                  </ul>
                  <p className="pt-1">
                    <Link href="/docs" className="text-primary hover:underline">Full documentation</Link> (see Deploy to Vercel &amp; FAQs in docs).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Preview URL (paste for iframe) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview URL</CardTitle>
              <CardDescription>
                Already have a live URL? Paste it here to view in the iframe (e.g. after deploy or running locally).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="url"
                placeholder="https://your-app.vercel.app or http://localhost:3000"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
            </CardContent>
          </Card>

          {previewUrl && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Live preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-background-tertiary overflow-hidden min-h-[400px]">
                  <iframe
                    title="Preview"
                    src={previewUrl}
                    className="w-full h-[500px] border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {project?.deployedUrl && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Live deployment</CardTitle>
                <CardDescription>
                  Your project is deployed. Open the link or paste it above to preview in the iframe.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(project.deployedUrl!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open live site
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
