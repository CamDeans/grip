import { NextResponse } from 'next/server'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN

/**
 * GET /api/github/repo-readme?owner=...&repo=...
 * Fetches README.md content and extracts image URLs for repo preview (non-dev friendly).
 * Used by RepoPreviewModal on the create-project page.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')

  if (!owner || !repo) {
    return NextResponse.json({ error: 'owner and repo are required' }, { status: 400 })
  }

  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
    }

    // Get default branch (for resolving image URLs)
    const repoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, { headers })
    if (!repoRes.ok) {
      const err = await repoRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message || 'Repository not found or not accessible' },
        { status: repoRes.status === 404 ? 404 : 500 }
      )
    }
    const repoData = await repoRes.json()
    const defaultBranch = repoData.default_branch || 'main'

    // Get README (raw markdown)
    const readmeRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
      { headers: { ...headers, Accept: 'application/vnd.github.raw' } }
    )
    if (!readmeRes.ok) {
      if (readmeRes.status === 404) {
        return NextResponse.json({ readme: '', imageUrls: [], defaultBranch })
      }
      const err = await readmeRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message || 'README not found' },
        { status: readmeRes.status }
      )
    }
    const readme = await readmeRes.text()

    // Extract image paths from markdown: ![alt](path) or ![](path)
    const imageUrls: string[] = []
    const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g
    let m
    const base = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}`
    while ((m = imgRe.exec(readme)) !== null) {
      let path = m[2].trim()
      if (path.startsWith('http')) {
        imageUrls.push(path)
      } else {
        // Relative path: resolve from README location (repo root)
        if (path.startsWith('./')) path = path.slice(2)
        imageUrls.push(`${base}/${path}`)
      }
    }
    // Resolve image paths in readme so rendered markdown can load images
    const readmeWithResolvedImages = readme.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, path: string) => {
      let href = path.trim()
      if (!href.startsWith('http')) {
        if (href.startsWith('./')) href = href.slice(2)
        href = `${base}/${href}`
      }
      return `![${alt}](${href})`
    })

    const unique = Array.from(new Set(imageUrls))
    return NextResponse.json({ readme: readmeWithResolvedImages, imageUrls: unique, defaultBranch })
  } catch (error) {
    console.error('repo-readme error:', error)
    return NextResponse.json({ error: 'Failed to fetch README' }, { status: 500 })
  }
}
