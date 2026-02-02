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

  // Check message length
  if (message.length > 5000) {
    return {
      isValid: false,
      error: 'Message is too long (max 5000 characters)'
    }
  }

  // Check for potentially harmful content
  const harmfulPatterns = [
    /<script>/i,
    /javascript:/i,
    /on\w+=/i,
    /data:/i
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