/**
 * One-time migration: normalize sandbox projectId from string to ObjectId
 * in sandboxAnalyses and legalSandboxPlans so queries using ObjectId succeed.
 *
 * Run: npx ts-node --project tsconfig.json -r tsconfig-paths/register src/scripts/migrate-sandbox-projectid-to-objectid.ts
 * Or add to package.json: "migrate:sandbox-projectid": "ts-node -r tsconfig-paths/register src/scripts/migrate-sandbox-projectid-to-objectid.ts"
 */

import { MongoClient, ObjectId } from 'mongodb'

const SANDBOX_ANALYSES = 'sandboxAnalyses'
const LEGAL_SANDBOX_PLANS = 'legalSandboxPlans'

async function migrate() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is required')
    process.exit(1)
  }
  const dbName = process.env.MONGODB_DB_NAME || 'test'

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)

    for (const collName of [SANDBOX_ANALYSES, LEGAL_SANDBOX_PLANS]) {
      const coll = db.collection(collName)
      const stringIds = await coll.find({ projectId: { $type: 'string' } }).toArray()
      let updated = 0
      let errors = 0
      for (const doc of stringIds) {
        const str = doc.projectId as string
        if (!ObjectId.isValid(str)) {
          console.warn(`[${collName}] Skipping invalid projectId: ${str} (_id: ${doc._id})`)
          errors++
          continue
        }
        try {
          const result = await coll.updateOne(
            { _id: doc._id },
            { $set: { projectId: new ObjectId(str) } }
          )
          if (result.modifiedCount) updated++
        } catch (e) {
          console.warn(`[${collName}] Update failed for _id ${doc._id}:`, e)
          errors++
        }
      }
      console.log(`[${collName}] Updated ${updated} documents (${stringIds.length} with string projectId, ${errors} errors)`)
    }

    console.log('Migration finished.')
  } finally {
    await client.close()
  }
}

migrate().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
