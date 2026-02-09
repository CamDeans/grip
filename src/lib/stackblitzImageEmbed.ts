/**
 * Embed image files as data URIs in HTML/JSX/CSS so StackBlitz shows images correctly.
 * StackBlitz ProjectFiles accept strings only and do not decode base64 for image paths,
 * so we inline images into source files and omit image files from the payload.
 */

import { isImagePath, getImageMimeType } from './imageValidation'

const SOURCE_EXTENSIONS = /\.(html?|jsx?|tsx?|css|mjs|cjs)$/i

function normalizePath(p: string): string {
  return p.replace(/^\.\//, '').replace(/^\/+/, '').trim()
}

/** Resolve path relative to the file at fileKey (e.g. ./assets/logo.png from src/App.tsx -> src/assets/logo.png). */
function resolvePath(path: string, fileKey: string): string {
  const trimmed = path.trim()
  if (!trimmed.startsWith('.')) return normalizePath(trimmed)
  let dir = fileKey.includes('/') ? fileKey.slice(0, fileKey.lastIndexOf('/')) : ''
  let rest = trimmed
  while (rest.startsWith('../')) {
    rest = rest.slice(3)
    dir = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : ''
  }
  if (rest.startsWith('./')) rest = rest.slice(2)
  const resolved = dir ? `${dir}/${rest}` : rest
  return normalizePath(resolved)
}

/**
 * Build StackBlitz-ready files: embed image references in HTML/JSX/CSS as data URIs
 * so the preview displays images. Image files are kept in the payload so folder structure
 * (e.g. images/, public/images/) exists in StackBlitz.
 */
export function embedImagesAndRemoveImageFiles(
  files: Record<string, string>
): Record<string, string> {
  const imageKeys = new Set<string>()
  const dataUrlByPath = new Map<string, string>()

  for (const key of Object.keys(files)) {
    if (!isImagePath(key)) continue
    const content = files[key]
    if (!content || !content.trim()) continue
    const normalized = normalizePath(key)
    imageKeys.add(normalized)
    imageKeys.add(key)
    dataUrlByPath.set(normalized, `data:${getImageMimeType(key)};base64,${content}`)
    dataUrlByPath.set(key, `data:${getImageMimeType(key)};base64,${content}`)
  }

  if (imageKeys.size === 0) return { ...files }

  const result = { ...files }

  for (const key of Object.keys(result)) {
    if (isImagePath(key)) continue
    if (!SOURCE_EXTENSIONS.test(key)) continue
    let content = result[key]
    if (typeof content !== 'string') continue

    const resolveDataUrl = (pathVal: string): string | undefined => {
      const norm = normalizePath(pathVal)
      const resolved = resolvePath(pathVal, key)
      return dataUrlByPath.get(resolved) ?? dataUrlByPath.get(norm) ?? dataUrlByPath.get(pathVal)
    }

    // Replace src="/path" or src='path' or src="./path" (HTML/JSX)
    content = content.replace(
      /(src\s*=\s*)(["'])([^"']+)\2/g,
      (_, prefix: string, _quote: string, path: string) => {
        const dataUrl = resolveDataUrl(path)
        if (dataUrl) return `${prefix}"${dataUrl}"`
        return prefix + _quote + path + _quote
      }
    )

    // Replace src={"/path"} or src={'path'} (JSX with string literal in braces)
    content = content.replace(
      /(src\s*=\s*\{)(["'])([^"']+)\2(\})/g,
      (_, prefix: string, _quote: string, path: string, suffix: string) => {
        const dataUrl = resolveDataUrl(path)
        if (dataUrl) return `${prefix}"${dataUrl}"${suffix}`
        return prefix + _quote + path + _quote + suffix
      }
    )

    // Replace url('path') or url("path") or url(path) (CSS)
    content = content.replace(
      /url\s*\(\s*(["']?)([^)"']+)\1\s*\)/g,
      (_match: string, _quote: string, path: string) => {
        const pathVal = path.trim()
        const dataUrl = resolveDataUrl(pathVal)
        if (dataUrl) return `url("${dataUrl}")`
        return _match
      }
    )

    // Replace import x from './image.png' with const x = 'data:...' (JS/TS/JSX)
    content = content.replace(
      /import\s+(\w+)\s+from\s+(["'])([^"']+)\2\s*;?/g,
      (match: string, ident: string, _quote: string, path: string) => {
        const dataUrl = resolveDataUrl(path)
        if (dataUrl) return `const ${ident} = "${dataUrl}";`
        return match
      }
    )

    result[key] = content
  }

  // Keep image files in the payload so folder structure (e.g. /images, public/images) exists in StackBlitz.
  // Source files already have data URIs inlined so the preview displays images correctly.
  return result
}
