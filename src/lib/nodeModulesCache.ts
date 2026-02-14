/**
 * Cache node_modules by package.json (+ lockfile) hash to speed up repeated
 * builds when dependencies haven't changed. Used by runMainProject and runSandboxProject.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

const CACHE_ROOT = process.env.GRIP_NODE_CACHE || path.join(os.tmpdir(), 'grip-node-cache')
const MAX_CACHE_ENTRIES = 12

/**
 * Compute a stable hash for cache key from package.json and lockfile content.
 */
export function getDepsHash(tmpDir: string): string {
  const pkgPath = path.join(tmpDir, 'package.json')
  let content = ''
  if (fs.existsSync(pkgPath)) {
    content = fs.readFileSync(pkgPath, 'utf8')
  }
  const lockNames = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']
  for (const name of lockNames) {
    const lockPath = path.join(tmpDir, name)
    if (fs.existsSync(lockPath)) {
      content += fs.readFileSync(lockPath, 'utf8')
      break
    }
  }
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 32)
}

/**
 * Get cache dir for this hash. Returns path to cache entry (contains node_modules).
 */
export function getCacheDirForHash(hash: string): string {
  return path.join(CACHE_ROOT, hash)
}

/**
 * Check if we have a valid cache for this hash (cache dir exists and has node_modules).
 */
export function hasCache(hash: string): boolean {
  const cacheDir = getCacheDirForHash(hash)
  const nodeModules = path.join(cacheDir, 'node_modules')
  return fs.existsSync(cacheDir) && fs.existsSync(nodeModules) && fs.statSync(nodeModules).isDirectory()
}

/**
 * Copy node_modules from cache to project temp dir. Caller must ensure hasCache(hash).
 */
export function copyFromCache(hash: string, tmpDir: string): void {
  const cacheDir = getCacheDirForHash(hash)
  const src = path.join(cacheDir, 'node_modules')
  const dest = path.join(tmpDir, 'node_modules')
  if (!fs.existsSync(src)) return
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.cpSync(src, dest, { recursive: true, force: true })
}

/**
 * Copy node_modules from project temp dir to cache (after successful npm install).
 */
export function copyToCache(tmpDir: string, hash: string): void {
  const src = path.join(tmpDir, 'node_modules')
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) return
  const cacheDir = getCacheDirForHash(hash)
  const dest = path.join(cacheDir, 'node_modules')
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  try {
    fs.cpSync(src, dest, { recursive: true, force: true })
  } catch {
    // ignore (e.g. disk full); cache is optional
  }
}

/**
 * Prune cache to at most MAX_CACHE_ENTRIES, removing oldest entries by mtime.
 */
export function pruneCache(): void {
  try {
    if (!fs.existsSync(CACHE_ROOT)) return
    const entries = fs.readdirSync(CACHE_ROOT)
      .map((name) => {
        const full = path.join(CACHE_ROOT, name)
        try {
          const stat = fs.statSync(full)
          return { name, mtime: stat.mtimeMs, full }
        } catch {
          return null
        }
      })
      .filter((e): e is { name: string; mtime: number; full: string } => e != null && fs.statSync(e.full).isDirectory())
    if (entries.length <= MAX_CACHE_ENTRIES) return
    entries.sort((a, b) => a.mtime - b.mtime)
    const toRemove = entries.length - MAX_CACHE_ENTRIES
    for (let i = 0; i < toRemove; i++) {
      try {
        fs.rmSync(entries[i].full, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}
