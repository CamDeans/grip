import { MongoClient, ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'

const hasMongo = !!process.env.MONGODB_URI
;(hasMongo ? describe : describe.skip)('Project Collaboration', () => {
  let client: MongoClient

  beforeAll(async () => {
    client = await clientPromise
  })

  afterAll(async () => {
    await client.close()
  })

  it('should add collaborator to project', async () => {
    const db = client.db()
    const projectId = new ObjectId()
    const userId = new ObjectId()

    const result = await db.collection('projects').updateOne(
      { _id: projectId },
      { $addToSet: { collaborators: userId } }
    )

    expect(result.modifiedCount).toBe(1)
  })

  it('should list project collaborators', async () => {
    const db = client.db()
    const projectId = new ObjectId()

    const project = await db.collection('projects').findOne({ _id: projectId })
    expect(project?.collaborators).toBeDefined()
    expect(Array.isArray(project?.collaborators)).toBe(true)
  })
})
