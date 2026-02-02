// In-memory store for rate limiting
// Note: This is not suitable for production with multiple server instances
// For production, use Redis or another distributed cache
interface RateLimitEntry {
  count: number;
  reset: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting utility for API endpoints
 * @param {string} identifier - Unique identifier for the rate limit (e.g., endpoint name)
 * @param {number} limit - Maximum number of requests allowed within the time window
 * @param {string} window - Time window for the rate limit (e.g., '1h', '10m', '1d')
 * @returns {Promise<{success: boolean, reset: number}>} - Results of the rate limit check
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  window: string
): Promise<{ success: boolean; reset: number }> {
  try {
    // Clean up expired entries
    cleanupExpiredEntries();

    // Parse the window string to milliseconds
    const windowMs = parseTimeWindow(window);
    
    // Create a unique key for this rate limit
    const key = `rate-limit:${identifier}`;
    
    // Get the current entry or create new one
    const now = Date.now();
    const entry = rateLimitStore.get(key) || { 
      count: 0, 
      reset: now + windowMs 
    };
    
    // Check if the rate limit period has reset
    if (entry.reset <= now) {
      // Start a new rate limit period
      entry.count = 1;
      entry.reset = now + windowMs;
      rateLimitStore.set(key, entry);
      return { success: true, reset: entry.reset };
    }
    
    // If under the limit, increment the counter
    if (entry.count < limit) {
      entry.count += 1;
      rateLimitStore.set(key, entry);
      return { success: true, reset: entry.reset };
    }
    
    // Rate limit exceeded
    return { success: false, reset: entry.reset };
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow the request to proceed
    return { success: true, reset: Date.now() + 3600000 };
  }
}

/**
 * Parse a time window string into milliseconds
 * @param {string} window - Time window (e.g., '1h', '10m', '1d')
 * @returns {number} - Time window in milliseconds
 */
function parseTimeWindow(window: string): number {
  const unit = window.slice(-1);
  const value = parseInt(window.slice(0, -1), 10);
  
  switch (unit) {
    case 's':
      return value * 1000; // seconds
    case 'm':
      return value * 60 * 1000; // minutes
    case 'h':
      return value * 60 * 60 * 1000; // hours
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days
    default:
      return 60 * 60 * 1000; // default: 1 hour
  }
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  // Use Array.from to convert Map entries to array that can be safely iterated
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (entry.reset <= now) {
      rateLimitStore.delete(key);
    }
  });
} 