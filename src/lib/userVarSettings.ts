/**
 * User Var Settings — optional collection for user-specific vars (e.g. Dashboard overrides).
 * Only used when USE_USER_VAR_SETTINGS_COLLECTION=true. Otherwise no-op / null.
 * Keeps experiments separate from the main users collection; no migration in this phase.
 */

import 'server-only'
import { ObjectId } from 'mongodb'
import clientPromise, { DB_NAME } from '@/lib/db'

const COLLECTION = 'userVarSettings'

function useCollection(): boolean {
  return process.env.USE_USER_VAR_SETTINGS_COLLECTION === 'true'
}

/**
 * Get user var settings. Returns null if flag is off or not found.
 */
export async function getUserVarSettings(userId: string): Promise<Record<string, unknown> | null> {
  if (!useCollection()) return null
  if (!userId?.trim()) return null
  let oid: ObjectId
  try {
    oid = new ObjectId(userId)
  } catch {
    return null
  }
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const doc = await db.collection(COLLECTION).findOne(
      { userId: oid },
      { projection: { vars: 1 } }
    ) as { vars?: Record<string, unknown> } | null
    return doc?.vars ?? null
  } catch (e) {
    console.warn('[userVarSettings] getUserVarSettings error:', e)
    return null
  }
}

/**
 * Set user var settings (upsert by userId). No-op if flag is off.
 */
export async function setUserVarSettings(
  userId: string,
  vars: Record<string, unknown>
): Promise<void> {
  if (!useCollection()) return
  if (!userId?.trim()) return
  let oid: ObjectId
  try {
    oid = new ObjectId(userId)
  } catch {
    return
  }
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    await db.collection(COLLECTION).updateOne(
      { userId: oid },
      { $set: { vars, updatedAt: new Date() } },
      { upsert: true }
    )
  } catch (e) {
    console.warn('[userVarSettings] setUserVarSettings error:', e)
  }
}
