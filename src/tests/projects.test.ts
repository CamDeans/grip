import { MongoClient, ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'

const hasMongo = !!process.env.MONGODB_URI
;(hasMongo ? describe : describe.skip)('Projects', () => {
  let client: MongoClient

  beforeAll(async () => {
    client = await clientPromise
  })

  afterAll(async () => {
    await client.close()
  })

  it('should create a new project', async () => {
    const db = client.db()
    const userId = new ObjectId()

    const result = await db.collection('projects').insertOne({
      userId,
      title: 'Test Project',
      description: 'Test Description',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    expect(result.insertedId).toBeDefined()
  })

  it('should update a project', async () => {
    const db = client.db()
    const userId = new ObjectId()
    const project = await db.collection('projects').insertOne({
      userId,
      title: 'Original Title',
      description: 'Original Description',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await db.collection('projects').updateOne(
      { _id: project.insertedId },
      {
        $set: {
          title: 'Updated Title',
          updatedAt: new Date(),
        },
      }
    )

    expect(result.modifiedCount).toBe(1)
  })
})
