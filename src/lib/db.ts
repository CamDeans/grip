import 'server-only'
import { MongoClient, type MongoClientOptions } from 'mongodb'

// GRIP app DB only — never use user Backend connection (Dashboard Settings) here.
// Kept as runtime guard in case any client code ever imports this again.
if (typeof window !== 'undefined') {
  throw new Error(
    'Do not import @/lib/db in client code. This module is for the GRIP app database (MONGODB_URI) only and must run on the server.'
  )
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
/** App database name: from env in production, default 'test'. Use this for all client.db() calls. */
export const DB_NAME = process.env.MONGODB_DB_NAME || 'test'
const dbName = DB_NAME

const baseOptions: MongoClientOptions = {
  // Ensure default database matches lib/mongodb (projects use Mongoose with same name)
  dbName,
}

// Production (e.g. Vercel serverless): avoid SSL/TLS handshake issues with Atlas
if (process.env.NODE_ENV === 'production' && uri.startsWith('mongodb+srv://')) {
  baseOptions.serverSelectionTimeoutMS = 10000
  baseOptions.connectTimeoutMS = 10000
  // Minimize connection pool in serverless; new connection per invocation is OK
  baseOptions.minPoolSize = 0
  baseOptions.maxPoolSize = 5
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

// Defer throw until clientPromise is awaited (avoids crashing client bundle or SSR when env is missing)
const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  // Pending promise so modules load in tests without MONGODB_URI; tests can skip when !MONGODB_URI
  clientPromise = new Promise<MongoClient>(() => {})
} else if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, baseOptions)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, baseOptions)
  clientPromise = client.connect()
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise

// Helper function for Mongoose models
export async function dbConnect() {
  try {
    await clientPromise
    return { success: true }
  } catch (error) {
    console.error('MongoDB connection error:', error)
    return { success: false, error }
  }
} 