import mongoose from 'mongoose'

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

let globalWithMongo = global as {
  mongoose: MongooseCache | undefined
}

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

let cached: MongooseCache = globalWithMongo.mongoose || { conn: null, promise: null }
globalWithMongo.mongoose = cached

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts)
      .then(mongoose => {
        console.log('Connected to MongoDB Atlas')
        return mongoose
      })
      .catch(error => {
        console.error('Error connecting to MongoDB Atlas:', error)
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
} 
