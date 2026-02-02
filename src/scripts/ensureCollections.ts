/**
 * Script to ensure all collections are created in MongoDB with proper validation
 * Run this script when adding new collections to the database
 */

import { connectToDatabase } from '@/lib/mongodb'
import mongoose from 'mongoose'

// Side-effect import: load all models so they register with Mongoose
import '@/lib/models'

async function ensureCollections() {
  try {
    console.log('Connecting to MongoDB...')
    await connectToDatabase()
    console.log('Connected to MongoDB successfully')

    // Get registered models
    const models = mongoose.modelNames()
    console.log('Registered models:', models)

    // Create collections for each model
    for (const modelName of models) {
      try {
        const model = mongoose.model(modelName)
        const collectionName = model.collection.name
        
        console.log(`Ensuring collection exists: ${collectionName}`)
        await model.createCollection()
        console.log(`Collection ${collectionName} created/verified successfully`)
      } catch (error) {
        console.error(`Error creating collection for model ${modelName}:`, error)
      }
    }

    console.log('All collections created/verified successfully')
    process.exit(0)
  } catch (error) {
    console.error('Error ensuring collections:', error)
    process.exit(1)
  }
}

ensureCollections() 