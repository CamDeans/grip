import path from 'path'

/**
 * Validates a file system path to ensure it's safe to use
 * @param filePath The path to validate
 * @returns boolean indicating if the path is safe
 */
export function validatePath(filePath: string): boolean {
  try {
    console.log('Validating path:', filePath)
    
    // Normalize the path to resolve any '..' or '.' segments
    const normalizedPath = path.normalize(filePath)
    console.log('Normalized path:', normalizedPath)
    
    // Check if path is absolute and starts with the user's documents directory
    const documentsPath = 'C:\\Users\\camer\\Documents'
    console.log('Documents path:', documentsPath)
    console.log('Path starts with documents?', normalizedPath.startsWith(documentsPath))

    if (!normalizedPath.startsWith(documentsPath)) {
      console.log('Path validation failed: Not in documents directory')
      return false
    }

    // Check for any suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>"|?*]/,  // Invalid Windows characters
      /[\x00-\x1F]/  // Control characters
    ]

    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(normalizedPath))
    if (hasSuspiciousPattern) {
      console.log('Path validation failed: Contains suspicious pattern')
      return false
    }

    console.log('Path validation passed')
    return true
  } catch (error) {
    console.error('Path validation error:', error)
    return false
  }
} 