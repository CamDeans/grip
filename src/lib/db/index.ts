import { MongoClient, ServerApiVersion } from 'mongodb'
import mongoose, { Mongoose } from 'mongoose'
import { serializeDocument } from '../utils'

// Environment checks
const isClient = typeof window !== 'undefined'
const MONGODB_URI = process.env.MONGODB_URI || ''
const DB_NAME = 'test'
const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds

// MongoDB Client Configuration
const clientOpts = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  dbName: DB_NAME,
  ssl: true, // Enable SSL/TLS
  retryWrites: true,
  retryReads: true,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
  monitorCommands: true,
  autoEncryption: {
    keyVaultNamespace: 'encryption.__keyVault',
    kmsProviders: {
      local: {
        key: Buffer.from(process.env.ENCRYPTION_KEY || '')
      }
    }
  }
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
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
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

// Health check function
async function checkConnectionHealth(client: MongoClient): Promise<boolean> {
  try {
    await client.db().command({ ping: 1 })
    return true
  } catch (error) {
    console.error('MongoDB health check failed:', error)
    return false
  }
}

// Retry function with exponential backoff
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
      
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1)
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

if (isClient) {
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

async function dbConnect(): Promise<Mongoose> {
  if (isClient) {
    console.warn('Attempting to connect to MongoDB from client-side code')
    return mongoose
  }

  // Check if connection is healthy
  const now = Date.now()
  if (cached.conn && (now - cached.lastHealthCheck) < 30000) {
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

// Initialize mongoose connection on server side
if (!isClient) {
  console.log('Initializing mongoose connection...')
  dbConnect()
    .then(() => console.log('Initial mongoose connection established'))
    .catch((err) => console.error('Initial mongoose connection error:', err))
}

// Cleanup function for graceful shutdown
async function cleanup() {
  try {
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
  }
}

// Handle process termination
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

export {
  dbConnect,
  serializeDocument,
  isClient,
  DB_NAME,
  MongoClient,
  mongoose,
  cleanup,
  checkConnectionHealth
}

export default clientPromise 