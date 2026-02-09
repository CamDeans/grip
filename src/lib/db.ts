import { MongoClient, type MongoClientOptions } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const dbName = process.env.MONGODB_DB_NAME || 'test'

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

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local')
}

if (process.env.NODE_ENV === 'development') {
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