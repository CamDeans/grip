/**
 * User upload validation for GRIP and Sandbox GRIP.
 * Supports images (for websites, logos, favicons) and reference docs (specs, copy) for use in builds.
 */

import { isImagePath, validateImageContent } from '@/lib/imageValidation'

/** Max size per file (4MB) — within typical serverless body limits. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** Allowed image MIME types for upload. */
export const ALLOWED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/x-icon',
  'image/bmp',
])

/** Allowed reference-doc MIME types. */
export const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
])

/** Extensions that map to reference_doc purpose. */
export const DOC_EXTENSIONS = /\.(pdf|txt|md|markdown)(\?.*)?$/i

export type UploadPurpose = 'image' | 'reference_doc'

export function getUploadPurpose(
  mimeType: string,
  filename: string
): UploadPurpose | null {
  if (ALLOWED_IMAGE_MIMES.has(mimeType) || isImagePath(filename)) {
    return 'image'
  }
  if (ALLOWED_DOC_MIMES.has(mimeType) || DOC_EXTENSIONS.test(filename)) {
    return 'reference_doc'
  }
  return null
}

export function isAllowedUpload(mimeType: string, filename: string): boolean {
  return getUploadPurpose(mimeType, filename) !== null
}

/**
 * Validate and prepare content for storage.
 * Images: must be valid base64 image bytes. Docs: stored as base64 (PDF) or UTF-8 string (txt/md).
 */
export function validateAndPrepareUploadContent(
  buffer: Buffer,
  purpose: UploadPurpose,
  filename: string
): { ok: true; content: string; language: string } | { ok: false; error: string } {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File exceeds ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit` }
  }
  if (purpose === 'image') {
    const base64 = buffer.toString('base64')
    const { valid, normalized, error } = validateImageContent(base64, filename)
    if (!valid) {
      return { ok: false, error: error || 'Invalid image content' }
    }
    return {
      ok: true,
      content: normalized ?? base64,
      language: 'plaintext',
    }
  }
  // reference_doc: PDF as base64, txt/md as UTF-8
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) {
    return {
      ok: true,
      content: buffer.toString('base64'),
      language: 'plaintext',
    }
  }
  const text = buffer.toString('utf8')
  return {
    ok: true,
    content: text,
    language: lower.endsWith('.md') || lower.endsWith('.markdown') ? 'markdown' : 'plaintext',
  }
}

/** Default path for images (e.g. public/ so they are at public/logo.png). */
export const DEFAULT_IMAGE_PATH = 'public'

/** Default path for reference docs. */
export const DEFAULT_DOC_PATH = 'docs'
