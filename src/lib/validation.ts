interface ValidationResult {
  isValid: boolean
  error?: string
}

export function validateMessage(message: string): ValidationResult {
  // Check if message is empty or only whitespace
  if (!message.trim()) {
    return {
      isValid: false,
      error: 'Message cannot be empty'
    }
  }

  // Check message length (allow pasted StackBlitz/build errors and stack traces)
  const maxLength = 32000
  if (message.length > maxLength) {
    return {
      isValid: false,
      error: `Message is too long (max ${(maxLength / 1000).toFixed(0)}k characters). Consider shortening or splitting.`
    }
  }

  // Check for potentially harmful content (allow pasted errors: "data:" in stack traces, "Invalid data", etc.)
  const harmfulPatterns = [
    /<script>/i,
    /javascript:/i,
    /on\w+=/i,
    // Only block executable/dangerous data URIs, not plain "data:" in pasted error text
    /\bdata:\s*text\/html\s*;/i,
    /\bdata:\s*application\/javascript\s*;/i,
    /\bdata:\s*image\/svg\+xml\s*;/i,
  ]

  for (const pattern of harmfulPatterns) {
    if (pattern.test(message)) {
      return {
        isValid: false,
        error: 'Message contains potentially harmful content'
      }
    }
  }

  // Check for rate limiting (this would be better handled server-side)
  const now = Date.now()
  const lastMessageTime = (window as any).lastMessageTime || 0
  if (now - lastMessageTime < 1000) { // 1 second cooldown
    return {
      isValid: false,
      error: 'Please wait before sending another message'
    }
  }

  // Update last message time
  ;(window as any).lastMessageTime = now

  return { isValid: true }
} 