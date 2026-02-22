/**
 * Deep analysis for package.json: infer stack from dependencies + file paths,
 * derive correct scripts, validate for StackBlitz, and repair mismatches.
 * Used by: highLevelFileContextService, exportService, preflight.
 */

export type InferredStack = 'next' | 'vite' | 'expo' | 'cra' | 'generic'

export const SCRIPTS_BY_STACK: Record<InferredStack, { dev: string; build: string; start: string }> = {
  next: { dev: 'next dev', build: 'next build', start: 'next start' },
  vite: { dev: 'vite', build: 'tsc && vite build', start: 'vite preview' },
  expo: { dev: 'expo start --web --port 8081', build: 'expo export', start: 'expo start --web' },
  cra: { dev: 'react-scripts start', build: 'react-scripts build', start: 'react-scripts start' },
  generic: { dev: 'vite', build: 'tsc && vite build', start: 'vite preview' },
}

/**
 * Infer stack from package.json dependencies and file paths (single source of truth).
 * Dependencies take precedence so scripts match what the project actually has.
 */
export function inferStackFromDepsAndPaths(
  deps: Record<string, string>,
  filePaths: string[] = []
): InferredStack {
  const paths = filePaths.map((p) => String(p).toLowerCase().replace(/\\/g, '/'))
  const hasDep = (name: string) => Object.prototype.hasOwnProperty.call(deps, name)

  if (hasDep('next')) return 'next'
  if (hasDep('expo') || hasDep('react-native')) return 'expo'
  if (hasDep('vite') || hasDep('@vitejs/plugin-react')) return 'vite'
  if (hasDep('react-scripts')) return 'cra'

  if (paths.some((p) => p.includes('next.config'))) return 'next'
  if (paths.some((p) => p.includes('vite.config'))) return 'vite'
  if (paths.some((p) => p.includes('app/') || p.includes('src/app/'))) return 'next'

  return 'generic'
}

export function getScriptsForStack(stack: InferredStack): { dev: string; build: string; start: string } {
  return SCRIPTS_BY_STACK[stack]
}

/**
 * Map import specifiers to npm package names (strip subpaths; scoped packages use first segment).
 */
export function extractNpmPackagesFromImports(importSpecifiers: string[]): string[] {
  const seen = new Set<string>()
  for (const spec of importSpecifiers) {
    if (!spec || spec.startsWith('.') || spec.startsWith('/')) continue
    const first = spec.split('/')[0]
    if (first?.startsWith('@')) {
      const second = spec.split('/')[1]
      if (second) seen.add(`${first}/${second}`)
      else seen.add(first)
    } else if (first) {
      seen.add(first)
    }
  }
  return Array.from(seen)
}

const IMPORT_REGEX = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g
const REQUIRE_REGEX = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

function extractImportsFromContent(content: string): string[] {
  const imports: string[] = []
  let m: RegExpExecArray | null
  IMPORT_REGEX.lastIndex = 0
  while ((m = IMPORT_REGEX.exec(content)) !== null) imports.push(m[1])
  REQUIRE_REGEX.lastIndex = 0
  while ((m = REQUIRE_REGEX.exec(content)) !== null) imports.push(m[1])
  return imports
}

const JS_TS_EXT = /\.(js|jsx|ts|tsx)$/

/**
 * Validate package.json against project files for StackBlitz: infer stack, check scripts match, optionally list missing deps.
 */
export function validatePackageJsonForStackBlitz(files: { path: string; content: string }[]): {
  ok: boolean
  errors: string[]
  suggestions: string[]
  inferredStack: InferredStack | null
  recommendedScripts: { dev: string; build: string; start: string } | null
  scriptMismatch: boolean
  missingDeps: string[]
} {
  const errors: string[] = []
  const suggestions: string[] = []
  const fileMap = new Map<string, string>()
  for (const f of files) {
    const key = (f.path || '').replace(/^\.\//, '').replace(/^\/+/, '').trim() || f.path
    fileMap.set(key, f.content)
  }
  const paths = Array.from(fileMap.keys())
  const pkgRaw = fileMap.get('package.json')
  if (!pkgRaw) {
    errors.push('package.json is required to run in StackBlitz.')
    suggestions.push('Add a package.json (e.g. via GRIP in Develop) so the project can install dependencies and run.')
    return {
      ok: false,
      errors,
      suggestions,
      inferredStack: null,
      recommendedScripts: null,
      scriptMismatch: false,
      missingDeps: [],
    }
  }
  let pkg: { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  try {
    pkg = JSON.parse(pkgRaw) as typeof pkg
  } catch {
    errors.push('package.json has invalid JSON (e.g. missing comma). Fix syntax so the project can run.')
    suggestions.push('In Develop, ask GRIP to fix or regenerate package.json.')
    return {
      ok: false,
      errors,
      suggestions,
      inferredStack: null,
      recommendedScripts: null,
      scriptMismatch: false,
      missingDeps: [],
    }
  }
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const inferredStack = inferStackFromDepsAndPaths(deps, paths)
  const recommendedScripts = getScriptsForStack(inferredStack)
  const current = pkg.scripts ?? {}
  const scriptMismatch =
    (recommendedScripts.dev && current.dev !== recommendedScripts.dev) ||
    (recommendedScripts.build && current.build !== recommendedScripts.build) ||
    (recommendedScripts.start && current.start !== recommendedScripts.start)
  if (scriptMismatch) {
    errors.push(
      `Scripts don't match the project stack (${inferredStack}). Use \`"dev": "${recommendedScripts.dev}"\`, \`"build": "${recommendedScripts.build}"\`, \`"start": "${recommendedScripts.start}"\` for StackBlitz.`
    )
    suggestions.push(`Update package.json scripts to match the stack: dev="${recommendedScripts.dev}", build="${recommendedScripts.build}", start="${recommendedScripts.start}".`)
  }
  const allImports: string[] = []
  for (const [path, content] of fileMap) {
    if (JS_TS_EXT.test(path) && content) allImports.push(...extractImportsFromContent(content))
  }
  const requiredPackages = extractNpmPackagesFromImports(allImports)
  const missingDeps = requiredPackages.filter((name) => !Object.prototype.hasOwnProperty.call(deps, name))
  if (missingDeps.length > 0) {
    suggestions.push(`Add missing dependencies for your code: ${missingDeps.slice(0, 10).join(', ')}${missingDeps.length > 10 ? '...' : ''}.`)
  }
  if (inferredStack === 'expo' && (!deps['react-native-web'] || !deps['react-dom'])) {
    suggestions.push('Expo/React Native: web deps (react-native-web, react-dom) will be added automatically for StackBlitz.')
  }
  return {
    ok: errors.length === 0,
    errors,
    suggestions,
    inferredStack,
    recommendedScripts,
    scriptMismatch,
    missingDeps,
  }
}

/**
 * Normalize package.json for StackBlitz: infer stack from deps + paths and set scripts to match (overwrite if wrong).
 * Call this before or instead of only filling missing scripts.
 */
export function normalizePackageJsonScriptsForStack(
  content: string,
  filePaths: string[] = []
): string {
  let pkg: { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; stackblitz?: Record<string, unknown>; [key: string]: unknown }
  try {
    pkg = JSON.parse(content) as typeof pkg
  } catch {
    return content
  }
  if (!pkg.scripts) pkg.scripts = {}
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const stack = inferStackFromDepsAndPaths(deps, filePaths)
  const scripts = getScriptsForStack(stack)
  pkg.scripts.dev = scripts.dev
  pkg.scripts.build = scripts.build
  pkg.scripts.start = scripts.start
  if (!pkg.stackblitz || typeof pkg.stackblitz !== 'object') pkg.stackblitz = {}
  const sb = pkg.stackblitz as Record<string, unknown>
  if (sb.startCommand === undefined && (pkg.scripts.dev || pkg.scripts.start)) {
    sb.startCommand = 'npm run dev'
  }
  return JSON.stringify(pkg, null, 2)
}
