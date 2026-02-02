import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoClient, ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { analyzeRepositoryStructure, generateCodeSuggestions } from '@/lib/analysis'

describe('Repository Analysis', () => {
  let client: MongoClient

  beforeAll(async () => {
    client = await clientPromise
  })

  afterAll(async () => {
    await client.close()
  })

  it('should store analysis results', async () => {
    const db = client.db()
    const projectId = new ObjectId()

    const result = await db.collection('analyses').insertOne({
      projectId,
      content: 'Test analysis content',
      status: 'completed',
      createdAt: new Date(),
    })

    expect(result.insertedId).toBeDefined()
  })

  it('should retrieve analysis history', async () => {
    const db = client.db()
    const projectId = new ObjectId()

    const analyses = await db
      .collection('analyses')
      .find({ projectId })
      .sort({ createdAt: -1 })
      .toArray()

    expect(Array.isArray(analyses)).toBe(true)
  })
})
