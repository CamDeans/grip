import { MongoClient, ServerApiVersion, Db } from 'mongodb'
import mongoose, { Mongoose } from 'mongoose'
import { EventEmitter } from 'events'

// Environment checks
const isClient = typeof window !== 'undefined'
const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = 'test'
const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds
const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
const MAX_POOL_SIZE = 10
const MIN_POOL_SIZE = 1
const MAX_IDLE_TIME_MS = 30000
const CONNECT_TIMEOUT_MS = 10000
const SOCKET_TIMEOUT_MS = 45000
const HEARTBEAT_FREQUENCY_MS = 10000

// MongoDB Client Configuration
const clientOpts = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: MAX_POOL_SIZE,
  minPoolSize: MIN_POOL_SIZE,
  maxIdleTimeMS: MAX_IDLE_TIME_MS,
  dbName: DB_NAME,
  ssl: true,
  retryWrites: true,
  retryReads: true,
  connectTimeoutMS: CONNECT_TIMEOUT_MS,
  socketTimeoutMS: SOCKET_TIMEOUT_MS,
  heartbeatFrequencyMS: HEARTBEAT_FREQUENCY_MS,
  monitorCommands: true,
  // autoEncryption omitted: requires optional dependency mongodb-client-encryption.
  // Add it back and install that package if you need client-side field-level encryption.
}

// Mongoose Configuration
const mongooseOpts = {
  bufferCommands: true,
  autoIndex: true,
  dbName: DB_NAME,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  ssl: true,
  retryWrites: true,
  retryReads: true,
  connectTimeoutMS: CONNECT_TIMEOUT_MS,
  socketTimeoutMS: SOCKET_TIMEOUT_MS,
  heartbeatFrequencyMS: HEARTBEAT_FREQUENCY_MS,
  monitorCommands: true
}

// Global type declarations
declare global {
  interface MongooseCache {
    conn: Mongoose | null
    promise: Promise<Mongoose> | null
    lastHealthCheck: number
  }
  var mongoose: {
    conn: Mongoose | null
    promise: Promise<Mongoose> | null
  }
  var _mongoClientPromise: Promise<MongoClient> | undefined
  var _mongoClient: MongoClient | undefined
}

// Initialize cached connections
let cached: MongooseCache = {
  conn: global.mongoose?.conn || null,
  promise: global.mongoose?.promise || null,
  lastHealthCheck: 0
}
let clientPromise: Promise<MongoClient>
let healthCheckInterval: NodeJS.Timeout | null = null

// Event emitter for connection events
const eventEmitter = new EventEmitter()

// Health check function with retry mechanism
async function checkConnectionHealth(client: MongoClient): Promise<boolean> {
  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
      await client.db().command({ ping: 1 })
      return true
    } catch (error) {
      retries++
      if (retries === MAX_RETRIES) {
        console.error('MongoDB health check failed after retries:', error)
        return false
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
    }
  }
  return false
}

// Retry mechanism for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      if (attempt === maxRetries) break
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
    }
  }
  throw lastError
}

// Initialize MongoDB client (skip when URI is missing so tests without MONGODB_URI can load)
if (isClient) {
  clientPromise = new Promise(() => {})
} else if (!MONGODB_URI) {
  // Lazy pending promise so modules load without connecting; tests can skip when !MONGODB_URI
  clientPromise = new Promise(() => {})
} else {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(MONGODB_URI, clientOpts)
      global._mongoClientPromise = withRetry(async () => {
        const connectedClient = await client.connect()
        console.log(`Connected to MongoDB Atlas - Database: ${DB_NAME}`)
        return connectedClient
      })
    }
    clientPromise = global._mongoClientPromise
  } else {
    const client = new MongoClient(MONGODB_URI, clientOpts)
    clientPromise = withRetry(async () => {
      const connectedClient = await client.connect()
      console.log(`Connected to MongoDB Atlas - Database: ${DB_NAME}`)
      return connectedClient
    })
  }
}

// Mongoose connection function with health checks
async function dbConnect(): Promise<Mongoose> {
  if (isClient) {
    console.warn('Attempting to connect to MongoDB from client-side code')
    return mongoose
  }

  // Check if connection is healthy
  const now = Date.now()
  if (cached.conn && (now - cached.lastHealthCheck) < HEALTH_CHECK_INTERVAL) {
    console.log('Using cached mongoose connection')
    return cached.conn
  }

  // Perform health check if needed
  if (cached.conn) {
    const isHealthy = await checkConnectionHealth(global._mongoClient!)
    if (isHealthy) {
      cached.lastHealthCheck = now
      return cached.conn
    }
  }

  if (!cached.promise) {
    console.log('Creating new mongoose connection...')
    cached.promise = withRetry(async () => {
      const connectedMongoose = await mongoose.connect(MONGODB_URI, mongooseOpts)
      console.log('Connected to MongoDB with Mongoose')
      return connectedMongoose
    })
  }

  try {
    cached.conn = await cached.promise
    cached.lastHealthCheck = now
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

// Start health check monitoring
function startHealthCheck(client: MongoClient) {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
  }

  healthCheckInterval = setInterval(async () => {
    const isHealthy = await checkConnectionHealth(client)
    if (!isHealthy) {
      eventEmitter.emit('healthCheckFailed')
      console.error('MongoDB health check failed')
    } else {
      eventEmitter.emit('healthCheckPassed')
    }
  }, HEALTH_CHECK_INTERVAL)
}

// Cleanup function for graceful shutdown
async function cleanup() {
  try {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }

    if (global._mongoClient) {
      await global._mongoClient.close()
      console.log('MongoDB client connection closed')
    }
    if (cached.conn) {
      await cached.conn.disconnect()
      console.log('Mongoose connection closed')
    }
  } catch (error) {
    console.error('Error during MongoDB cleanup:', error)
    throw error
  }
}

// Initialize mongoose connection on server side
if (!isClient) {
  console.log('Initializing mongoose connection...')
  dbConnect()
    .then(async () => {
      console.log('Initial mongoose connection established')
      const client = await clientPromise
      startHealthCheck(client)
    })
    .catch((err) => {
      console.error('Initial mongoose connection error:', err)
      eventEmitter.emit('connectionError', err)
    })
}

// Export the MongoDB service
export const mongoService = {
  connect: dbConnect,
  cleanup,
  clientPromise,
  eventEmitter,
  isClient,
  DB_NAME,
  MongoClient,
  mongoose,
  checkConnectionHealth,
  withRetry
}

// Export types
export type MongoService = typeof mongoService 