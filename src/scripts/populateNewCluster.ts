/**
 * Populate a new MongoDB cluster with collections and optional seed user.
 * Run after updating MONGODB_URI in .env.local (e.g. after recreating the cluster).
 *
 * Usage: npm run db:populate
 * Optional env: SEED_USER_EMAIL, SEED_USER_PASSWORD, SEED_USER_NAME for credentials user.
 */

import dotenv from 'dotenv'
import path from 'path'

// Load .env.local from project root (when run via npm run db:populate, cwd is project root)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_NAME || 'test'

async function main() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env.local')
    process.exit(1)
  }

  const { MongoClient } = await import('mongodb')
  const { hash } = await import('bcryptjs')

  console.log('Connecting to MongoDB...')
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  console.log(`Connected to database: ${DB_NAME}`)

  // NextAuth MongoDB adapter expects these collections (with JWT strategy we still need users + accounts for OAuth)
  const nextAuthCollections = ['users', 'accounts', 'sessions', 'verification_tokens']
  for (const name of nextAuthCollections) {
    try {
      await db.createCollection(name)
      console.log(`Created collection: ${name}`)
    } catch (err: any) {
      if (err.code === 48) console.log(`Collection already exists: ${name}`)
      else console.warn(`Collection ${name}:`, err.message)
    }
  }

  // App collections (create if not exist) – names used elsewhere in codebase
  const appCollections = [
    'projects',
    'projectStates',
    'chatHistory',
    'analyses',
    'analysis',
    'projectStructures',
    'projectFiles',
    'buildLogs',
    'notifications',
    'userSettings',
    'repositories',
    'tasks',
    'activityLogs',
    'settings',
    'planMetadata',
    'developmentPlans',
    'planBackups',
    'dependencyCache',
    'snapshots',
    'fileHistory',
    'artifacts',
    'anthropic_usage',
  ]
  for (const name of appCollections) {
    try {
      await db.createCollection(name)
      console.log(`Created collection: ${name}`)
    } catch (err: any) {
      if (err.code === 48) console.log(`Collection already exists: ${name}`)
      else console.warn(`Collection ${name}:`, err.message)
    }
  }

  // Optional: seed one credentials user for email/password login
  const seedEmail = process.env.SEED_USER_EMAIL
  const seedPassword = process.env.SEED_USER_PASSWORD
  const seedName = process.env.SEED_USER_NAME || 'G.R.I.P. Admin'

  if (seedEmail && seedPassword) {
    const users = db.collection('users')
    const existing = await users.findOne({ email: seedEmail })
    if (!existing) {
      const hashedPassword = await hash(seedPassword, 12)
      await users.insertOne({
        email: seedEmail,
        name: seedName,
        password: hashedPassword,
        createdAt: new Date(),
      })
      console.log(`Seeded credentials user: ${seedEmail}`)
    } else {
      console.log(`User already exists: ${seedEmail}`)
    }
  } else {
    console.log('Tip: Set SEED_USER_EMAIL, SEED_USER_PASSWORD (and optionally SEED_USER_NAME) in .env.local to create a credentials login user.')
  }

  await client.close()
  console.log('Done. Run "npm run db:init" to create Mongoose collections and indexes.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
