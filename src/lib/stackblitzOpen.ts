/**
 * Client-side StackBlitz opener: preflight, export-files, then openProject.
 * Use from browser only (fetch + @stackblitz/sdk).
 */

export function inferStackBlitzTemplate(files: Record<string, string>): string {
  const pkg = files['package.json']
  if (!pkg) {
    if (files['index.html'] && (files['index.js'] || files['index.ts'])) return 'javascript'
    if (files['index.html']) return 'html'
    return 'node'
  }
  return 'node'
}

export function inferOpenFile(files: Record<string, string>): string | undefined {
  const keys = Object.keys(files)
  if (keys.includes('index.html')) return 'index.html'
  if (keys.includes('src/App.tsx')) return 'src/App.tsx'
  if (keys.includes('src/App.jsx')) return 'src/App.jsx'
  if (keys.includes('src/main.tsx')) return 'src/main.tsx'
  if (keys.includes('src/main.jsx')) return 'src/main.jsx'
  if (keys.includes('src/main.ts')) return 'src/main.ts'
  if (keys.includes('src/main.js')) return 'src/main.js'
  if (keys.includes('src/Index.tsx')) return 'src/Index.tsx'
  if (keys.includes('App.tsx')) return 'App.tsx'
  return keys.find((k) => k.endsWith('index.html')) ?? keys[0]
}

export type OpenInStackBlitzOptions = {
  newWindow: boolean
}

export type OpenInStackBlitzResult =
  | { ok: true }
  | { ok: false; error: string; preflightErrors?: string[]; preflightSuggestions?: string[] }

/**
 * Legal-sandbox variant: uses the same StackBlitz template inference and preflight,
 * but exports only GRIP-created project files (no cloned repo files) via the
 * /legal-sandbox/export-files endpoint. Use this from dedicated legal-safety test UIs.
 */
export async function openInStackBlitzLegalSandbox(
  projectId: string,
  options: OpenInStackBlitzOptions
): Promise<OpenInStackBlitzResult> {
  const { newWindow } = options
  try {
    const preflightRes = await fetch(
      `/api/projects/${projectId}/legal-sandbox/preflight?target=stackblitz`,
      { credentials: 'include' }
    )
    const preflight = await preflightRes.json()
    if (!preflight.ok && Array.isArray(preflight.errors) && preflight.errors.length > 0) {
      return {
        ok: false,
        error: preflight.errors[0],
        preflightErrors: preflight.errors,
        preflightSuggestions: Array.isArray(preflight.suggestions) ? preflight.suggestions : [],
      }
    }

    const res = await fetch(
      `/api/projects/${projectId}/legal-sandbox/export-files`,
      { credentials: 'include' }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load legal-sandbox project files')
    const { files, title } = data
    if (!files || Object.keys(files).length === 0) {
      throw new Error('No GRIP-only files to run. Generate and save files first.')
    }
    const template = inferStackBlitzTemplate(files)
    const openFile = inferOpenFile(files)
    const sdk = await import('@stackblitz/sdk')
    const api = (sdk as { default?: { openProject: (p: unknown, o?: unknown) => void } }).default ?? sdk
    const openProject = api?.openProject
    if (typeof openProject !== 'function') throw new Error('StackBlitz SDK openProject not available')
    openProject(
      {
        files,
        template,
        title: title || 'GRIP Legal Sandbox Project',
        description: 'Legal-safety test project from G.R.I.P. — GRIP-only files, no cloned repo source',
      },
      {
        newWindow,
        view: 'default',
        ...(openFile ? { openFile } : {}),
      }
    )
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to open legal-sandbox project in StackBlitz',
    }
  }
}

/**
 * Run preflight, export-files, then open StackBlitz in current tab or new window.
 * Call from client only (uses fetch and dynamic import of @stackblitz/sdk).
 */
export async function openInStackBlitz(
  projectId: string,
  options: OpenInStackBlitzOptions
): Promise<OpenInStackBlitzResult> {
  const { newWindow } = options
  try {
    const preflightRes = await fetch(
      `/api/projects/${projectId}/preflight?target=stackblitz&record=1`,
      { credentials: 'include' }
    )
    const preflight = await preflightRes.json()
    if (!preflight.ok && Array.isArray(preflight.errors) && preflight.errors.length > 0) {
      return {
        ok: false,
        error: preflight.errors[0],
        preflightErrors: preflight.errors,
        preflightSuggestions: Array.isArray(preflight.suggestions) ? preflight.suggestions : [],
      }
    }
    const res = await fetch(`/api/projects/${projectId}/export-files`, { credentials: 'include' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load project files')
    const { files, title } = data
    if (!files || Object.keys(files).length === 0) {
      throw new Error('No files to run. Add generated files or link a repo.')
    }
    const template = inferStackBlitzTemplate(files)
    const openFile = inferOpenFile(files)
    const sdk = await import('@stackblitz/sdk')
    const api = (sdk as { default?: { openProject: (p: unknown, o?: unknown) => void } }).default ?? sdk
    const openProject = api?.openProject
    if (typeof openProject !== 'function') throw new Error('StackBlitz SDK openProject not available')
    openProject(
      {
        files,
        template,
        title: title || 'GRIP Project',
        description: 'Project from G.R.I.P. — run in browser',
      },
      {
        newWindow,
        view: 'default',
        ...(openFile ? { openFile } : {}),
      }
    )
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Failed to open in StackBlitz',
    }
  }
}
