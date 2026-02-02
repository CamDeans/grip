import { ObjectId } from 'mongodb'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { MongoClient } from 'mongodb'

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to a human-readable string
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

/**
 * Serialize MongoDB documents by converting ObjectIds and Dates to strings
 */
export function serializeDocument<T extends Record<string, any>>(doc: T): Record<string, any> | null {
  if (!doc) return null

  return Object.entries(doc).reduce((acc, [key, value]) => {
    // Handle ObjectId
    if (value && typeof value.toString === 'function' && value._bsontype === 'ObjectID') {
      acc[key] = value.toString()
    }
    // Handle Date objects
    else if (value instanceof Date) {
      acc[key] = value.toISOString()
    }
    // Handle Arrays
    else if (Array.isArray(value)) {
      acc[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return serializeDocument(item)
        }
        return item
      })
    }
    // Handle nested objects
    else if (typeof value === 'object' && value !== null) {
      acc[key] = serializeDocument(value)
    }
    // Handle primitive values
    else {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Generate a random string ID
 */
export function generateId(length: number = 8): string {
  return Math.random().toString(36).substring(2, length + 2)
}

export function parseId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id
}

// Server-side utilities
export async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined')
  }
  const client = await MongoClient.connect(process.env.MONGODB_URI)
  return client
}

// Other server-side utilities...

/**
 * Detects if code is running in client/browser environment
 * Used to conditionally import different modules for client vs server
 */
export const isClient = typeof window !== 'undefined';
