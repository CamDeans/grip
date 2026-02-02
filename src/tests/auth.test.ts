import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoClient } from 'mongodb'
import { hash } from 'bcryptjs'
import { clientPromise } from '@/lib/mongodb'

describe('Authentication', () => {
  let client: MongoClient

  beforeAll(async () => {
    client = await clientPromise
  })

  afterAll(async () => {
    await client.close()
  })

  it('should create a new user', async () => {
    const db = client.db()
    const email = 'test@example.com'
    const password = await hash('password123', 12)

    const result = await db.collection('users').insertOne({
      email,
      password,
      createdAt: new Date(),
    })

    expect(result.insertedId).toBeDefined()
  })

  it('should find an existing user', async () => {
    const db = client.db()
    const email = 'test@example.com'

    const user = await db.collection('users').findOne({ email })

    expect(user).toBeDefined()
    expect(user?.email).toBe(email)
  })
})
