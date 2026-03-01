/**
 * GRIP run log — single file to track all GRIP stages (analysis, plan, files, build).
 * Tail this file to follow progress:  tail -f logs/grip.log
 * Format: ISO timestamp [GRIP Stage N] event [optional JSON]
 */

import fs from 'fs'
import path from 'path'

const LOG_DIR = 'logs'
const LOG_FILE = 'grip.log'
const MAX_DATA_KEYS = 8
const MAX_STRING_LEN = 200

let logPath: string | null = null

function getLogPath(): string | null {
  if (logPath !== null) return logPath
  try {
    const cwd = process.cwd()
    const dir = path.join(cwd, LOG_DIR)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    logPath = path.join(dir, LOG_FILE)
    return logPath
  } catch {
    return null
  }
}

function safeStringify(obj: Record<string, unknown>): string {
  try {
    const reduced: Record<string, unknown> = {}
    let n = 0
    for (const [k, v] of Object.entries(obj)) {
      if (n >= MAX_DATA_KEYS) break
      if (v === undefined) continue
      if (typeof v === 'string' && v.length > MAX_STRING_LEN) {
        reduced[k] = v.slice(0, MAX_STRING_LEN) + '…'
      } else if (Array.isArray(v) && v.length > 10) {
        reduced[k] = v.slice(0, 10).concat([`…+${v.length - 10} more`])
      } else {
        reduced[k] = v
      }
      n++
    }
    return JSON.stringify(reduced)
  } catch {
    return '{}'
  }
}

/**
 * Write one line to logs/grip.log. Fire-and-forget; never throws.
 * Use this alongside existing console.[info|warn|error] so terminal and log stay in sync.
 */
export function gripLog(
  stage: number,
  event: string,
  data?: Record<string, unknown> | null
): void {
  const file = getLogPath()
  if (!file) return
  const ts = new Date().toISOString()
  const dataStr = data && Object.keys(data).length > 0 ? ' ' + safeStringify(data) : ''
  const line = `${ts} [GRIP Stage ${stage}] ${event}${dataStr}\n`
  fs.appendFile(file, line, (err) => {
    if (err) {
      // Avoid breaking the app; only log to stderr
      process.stderr?.write?.(`[gripLogger] write failed: ${err.message}\n`)
    }
  })
}

/**
 * Write a run delimiter so tail -f shows when a new GRIP run (e.g. files/generate) starts.
 */
export function gripLogRunStart(label: string, projectId: string): void {
  const file = getLogPath()
  if (!file) return
  const ts = new Date().toISOString()
  const line = `${ts} ---------- GRIP run: ${label} projectId=${projectId} ----------\n`
  fs.appendFile(file, line, () => {})
}
