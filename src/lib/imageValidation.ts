/**
 * Image content validation and normalization for GRIP.
 * Ensures image files from cloned repos and projectFiles have actual image content
 * (not blank, not UTF-8 decoded text, not encrypted) so StackBlitz can handle them.
 */

/** File extensions treated as images (subset of binary; we validate magic bytes). */
export const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|ico|webp|bmp)(\?.*)?$/i

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.test(path)
}

/** MIME type for image path (for data URLs and Content-Type). */
export function getImageMimeType(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  if (lower.endsWith('.ico')) return 'image/x-icon'
  return 'image/png'
}

/** Magic bytes for common image formats (first few bytes after base64 decode). */
const IMAGE_SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: 'PNG', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { name: 'JPEG', bytes: [0xff, 0xd8, 0xff] },
  { name: 'GIF87a', bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
  { name: 'GIF89a', bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  { name: 'WEBP', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF; WEBP also has 57 45 42 50 at offset 8
  { name: 'BMP', bytes: [0x42, 0x4d] },
  { name: 'ICO', bytes: [0x00, 0x00, 0x01, 0x00] },
]

function bufferStartsWith(buf: Buffer, sig: number[]): boolean {
  if (buf.length < sig.length) return false
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return false
  return true
}

/**
 * Normalize base64 string for image: strip whitespace/newlines, fix padding.
 * Returns normalized string or null if not valid base64.
 */
export function normalizeBase64ForImage(base64: string): string | null {
  if (typeof base64 !== 'string') return null
  const trimmed = base64.replace(/\s+/g, '').trim()
  if (!trimmed) return null
  try {
    // Ensure valid base64 length (multiple of 4); add padding if needed
    const remainder = trimmed.length % 4
    const padded = remainder === 0 ? trimmed : trimmed + '='.repeat(4 - remainder)
    Buffer.from(padded, 'base64') // ensure it decodes
    return padded
  } catch {
    return null
  }
}

/**
 * Validate that base64 decodes to actual image bytes (magic bytes).
 * Returns { valid, normalized, error }.
 * - valid: true if content is non-empty base64 and matches a known image signature.
 * - normalized: safe base64 string to store (stripped, padded); use this when saving.
 * - error: short message when invalid (blank, not base64, or not image format).
 */
export function validateImageContent(
  content: string,
  _path?: string
): { valid: boolean; normalized: string | null; error?: string } {
  if (typeof content !== 'string') {
    return { valid: false, normalized: null, error: 'Content must be a string' }
  }
  const trimmed = content.trim()
  if (!trimmed) {
    return { valid: false, normalized: null, error: 'Image content is blank' }
  }
  const normalized = normalizeBase64ForImage(trimmed)
  if (!normalized) {
    return { valid: false, normalized: null, error: 'Content is not valid base64' }
  }
  let buf: Buffer
  try {
    buf = Buffer.from(normalized, 'base64')
  } catch {
    return { valid: false, normalized: null, error: 'Failed to decode base64' }
  }
  if (buf.length < 4) {
    return { valid: false, normalized: null, error: 'Decoded content too short to be an image' }
  }
  const isKnownImage = IMAGE_SIGNATURES.some(({ bytes }) => bufferStartsWith(buf, bytes))
  if (!isKnownImage) {
    return {
      valid: false,
      normalized: null,
      error: 'Decoded content is not a recognized image format (PNG/JPEG/GIF/WEBP/BMP/ICO expected)',
    }
  }
  return { valid: true, normalized }
}

/**
 * 1x1 transparent PNG as base64. Use as placeholder when image content is missing or invalid
 * so StackBlitz still has a valid file at that path.
 */
export const PLACEHOLDER_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
