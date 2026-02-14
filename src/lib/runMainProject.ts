/**
 * Main GRIP: run the project in a temp dir (npm install + npm run build or dev)
 * to capture terminal/build errors. Mirrors sandbox `runSandboxProject` but
 * sources files from the main project's export set (GRIP-generated files only).
 *
 * Used so enhanced chat can automatically validate builds after applying code
 * changes, and feed any errors back into the conversation.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawnSync } from 'child_process'
import { getProjectFilesForExport } from '@/lib/services/exportService'
import {
  getDepsHash,
  hasCache,
  copyFromCache,
  copyToCache,
  pruneCache,
} from '@/lib/nodeModulesCache'

const RUN_TIMEOUT_MS = 120_000
const INSTALL_TIMEOUT_MS = 90_000
const BUILD_TIMEOUT_MS = 60_000
const QUICK_BUILD_TIMEOUT_MS = 30_000

export type MainRunResult = {
  success: boolean
  errors: string[]
  output: string
  buildCommand: string
}

/**
 * Write GRIP project files (gripOnly=true) to a temp dir, run npm install then
 * npm run build (or dev), capture stdout/stderr and return errors for chat.
 * Handles both main projects and sandbox projects.
 */
export async function runMainProject(projectId: string, isSandbox: boolean = false): Promise<MainRunResult> {
  let files: Array<{ path: string; content: string }>
  if (isSandbox) {
    const { getLegalSandboxFilesForExport } = await import('@/lib/services/legalSandboxService')
    files = await getLegalSandboxFilesForExport(projectId)
  } else {
    files = await getProjectFilesForExport(projectId, { gripOnly: true })
  }
  if (!files.length) {
    return {
      success: false,
      errors: ['No project files to run. Generate and save files in Develop first.'],
      output: '',
      buildCommand: 'npm run build',
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `grip-main-${projectId}-`))
  const errors: string[] = []
  let fullOutput = ''

  try {
    for (const { path: filePath, content } of files) {
      const normalized = (filePath || '').replace(/^\//, '').replace(/\\/g, '/').trim()
      if (!normalized || normalized === '.stackblitzrc' || normalized.endsWith('.stackblitzrc')) continue
      const fullPath = path.join(tmpDir, normalized)
      const dir = path.dirname(fullPath)
      if (fs.existsSync(dir)) {
        const stat = fs.statSync(dir)
        if (!stat.isDirectory()) {
          fs.unlinkSync(dir)
          fs.mkdirSync(dir, { recursive: true })
        }
      } else {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(fullPath, content ?? '', 'utf8')
    }

    const pkgPath = path.join(tmpDir, 'package.json')
    if (!fs.existsSync(pkgPath)) {
      return {
        success: false,
        errors: ['package.json is required to run. Ask GRIP in Develop to create it.'],
        output: '',
        buildCommand: 'npm run build',
      }
    }

    let pkg: { scripts?: Record<string, string> }
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> }
    } catch {
      return {
        success: false,
        errors: ['package.json has invalid JSON (e.g. trailing comma, missing bracket, or truncated). Ask GRIP to fix or regenerate package.json in Develop.'],
        output: '',
        buildCommand: 'npm run build',
      }
    }
    const hasScripts = pkg?.scripts && typeof pkg.scripts === 'object' && (pkg.scripts.build || pkg.scripts.dev || pkg.scripts.start)
    if (!hasScripts) {
      return {
        success: false,
        errors: ['package.json must have "scripts" with at least one of "build", "dev", or "start" so the project can run. Ask GRIP to add runnable scripts.'],
        output: '',
        buildCommand: 'npm run build',
      }
    }

    const depsHash = getDepsHash(tmpDir)
    if (hasCache(depsHash)) {
      copyFromCache(depsHash, tmpDir)
      fullOutput = '(node_modules restored from cache)\n'
    } else {
      const installResult = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
        cwd: tmpDir,
        encoding: 'utf8',
        timeout: INSTALL_TIMEOUT_MS,
        shell: true,
      })
      const installOut = (installResult.stdout ?? '').trim()
      const installErr = (installResult.stderr ?? '').trim()
      fullOutput = installOut + '\n' + installErr
      if (installResult.status !== 0) {
        const combined = (installOut + '\n' + installErr).trim()
        if (combined) errors.push(`npm install failed:\n${combined.slice(-2000)}`)
        return { success: false, errors, output: fullOutput, buildCommand: 'npm install' }
      }
      copyToCache(tmpDir, depsHash)
      pruneCache()
    }

    const scripts = pkg?.scripts ?? {}
    const buildCommand = scripts.build ? 'npm run build' : scripts.dev ? 'npm run dev' : 'npm run build'

    const buildCmd = scripts.build ? ['run', 'build'] : ['run', 'dev']
    let buildResult = spawnSync('npm', buildCmd, {
      cwd: tmpDir,
      encoding: 'utf8',
      timeout: QUICK_BUILD_TIMEOUT_MS,
      shell: true,
    })
    const timedOut = buildResult.status === null
    if (timedOut) {
      const firstOut = (buildResult.stdout ?? '').trim()
      const firstErr = (buildResult.stderr ?? '').trim()
      if (firstOut || firstErr) fullOutput = fullOutput + '\n' + firstOut + '\n' + firstErr
      fullOutput = fullOutput + '\n(first attempt timed out; retrying with longer timeout)\n'
      buildResult = spawnSync('npm', buildCmd, {
        cwd: tmpDir,
        encoding: 'utf8',
        timeout: BUILD_TIMEOUT_MS,
        shell: true,
      })
    }
    const buildOut = (buildResult.stdout ?? '').trim()
    const buildErr = (buildResult.stderr ?? '').trim()
    fullOutput = fullOutput + '\n' + buildOut + '\n' + buildErr
    if (buildResult.status !== 0) {
      const combined = (buildOut + '\n' + buildErr).trim()
      if (combined) errors.push(`${buildCommand} failed:\n${combined.slice(-3000)}`)
      return { success: false, errors, output: fullOutput, buildCommand }
    }

    return { success: true, errors: [], output: fullOutput, buildCommand }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }
}

