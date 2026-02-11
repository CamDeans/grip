import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

const COLLECTION = 'sandboxProjects'

export type SandboxProject = {
  _id: ObjectId
  userId: string
  title: string
  description: string
  repository?: { owner: string; name: string }
  ideation: {
    goals: string
    targetAudience: string
    keyFeatures: string
    technicalRequirements: string
  }
  createdAt: Date
  updatedAt: Date
  parentProjectId?: ObjectId | string // Link to main project if this is an experiment
}

export async function createSandboxProject(data: {
  userId: string
  title: string
  description: string
  repository?: { owner: string; name: string } | null
  ideation: { goals: string; targetAudience: string; keyFeatures: string; technicalRequirements: string }
  parentProjectId?: string | ObjectId // Optional: link to main project for experiments
}): Promise<SandboxProject> {
  const client = await clientPromise
  const db = client.db('test')
  const now = new Date()
  const doc: any = {
    userId: data.userId,
    title: data.title.trim(),
    description: data.description.trim(),
    repository: data.repository ?? undefined,
    ideation: {
      goals: (data.ideation.goals ?? '').trim(),
      targetAudience: (data.ideation.targetAudience ?? '').trim(),
      keyFeatures: (data.ideation.keyFeatures ?? '').trim(),
      technicalRequirements: (data.ideation.technicalRequirements ?? '').trim(),
    },
    createdAt: now,
    updatedAt: now,
  }
  if (data.parentProjectId) {
    doc.parentProjectId = typeof data.parentProjectId === 'string' ? new ObjectId(data.parentProjectId) : data.parentProjectId
  }
  const result = await db.collection(COLLECTION).insertOne(doc)
  return { _id: result.insertedId, ...doc } as SandboxProject
}

export async function listSandboxProjects(userId: string): Promise<SandboxProject[]> {
  const client = await clientPromise
  const db = client.db('test')
  const docs = await db
    .collection(COLLECTION)
    .find({ userId })
    .sort({ updatedAt: -1 })
    .toArray()
  return docs as SandboxProject[]
}

export async function getSandboxProject(projectId: string): Promise<SandboxProject | null> {
  if (!projectId || !ObjectId.isValid(projectId)) return null
  const client = await clientPromise
  const db = client.db('test')
  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(projectId) })
  return doc as SandboxProject | null
}
