'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { ExternalLink, Loader2, Play } from 'lucide-react'

export default function ProjectPreviewPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  const [project, setProject] = useState<{ repository?: { owner: string; name: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data)
      })
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }, [projectId])

  const repoFull = project?.repository ? `${project.repository.owner}/${project.repository.name}` : ''
  const stackblitzUrl = repoFull
    ? `https://stackblitz.com/github/${project!.repository!.owner}/${project!.repository!.name}`
    : ''

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Preview</h2>
        <p className="text-sm text-text-secondary">
          Run your project in the browser or paste a live URL to view it here.
        </p>
      </div>

      {loading ? (
        <Card className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading project...</span>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview URL</CardTitle>
              <CardDescription>
                Enter a URL where your app is running (e.g. Vercel preview or local tunnel) to view it in-app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input
                  type="url"
                  placeholder="https://your-app.vercel.app"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
              </div>
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

          {repoFull && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Run in browser</CardTitle>
                <CardDescription>
                  Open your repo in StackBlitz to run and edit it in the browser—no local install needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="default"
                  className="gap-2"
                  onClick={() => window.open(stackblitzUrl, '_blank')}
                >
                  <Play className="h-4 w-4" />
                  Open in StackBlitz
                </Button>
                <p className="text-xs text-text-muted mt-2">
                  Repo: {repoFull}
                </p>
              </CardContent>
            </Card>
          )}

          {!project?.repository && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6">
                <p className="text-sm text-text-secondary">
                  Link a GitHub repository in project settings to enable &quot;Open in StackBlitz&quot;.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
