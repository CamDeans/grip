/**
 * Populate a new MongoDB cluster with collections and optional seed user.
 * Run after updating MONGODB_URI in .env.local (e.g. after recreating the cluster).
 *
 * Usage (from project root): npm run db:populate
 * Optional env in .env.local: SEED_USER_EMAIL, SEED_USER_PASSWORD, SEED_USER_NAME
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') })

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = process.env.MONGODB_DB_NAME || 'test'

async function main() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env.local')
    process.exit(1)
  }

  const { MongoClient } = require('mongodb')
  const { hash } = require('bcryptjs')

  console.log('Connecting to MongoDB...')
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db(DB_NAME)
  console.log(`Connected to database: ${DB_NAME}`)

  const nextAuthCollections = ['users', 'accounts', 'sessions', 'verification_tokens']
  for (const name of nextAuthCollections) {
    try {
      await db.createCollection(name)
      console.log(`Created collection: ${name}`)
    } catch (err) {
      if (err.code === 48) console.log(`Collection already exists: ${name}`)
      else console.warn(`Collection ${name}:`, err.message)
    }
  }

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
    } catch (err) {
      if (err.code === 48) console.log(`Collection already exists: ${name}`)
      else console.warn(`Collection ${name}:`, err.message)
    }
  }

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
