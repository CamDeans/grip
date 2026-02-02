import { NextResponse } from 'next/server'
import clientPromise from '@/lib/db'

export async function GET() {
  try {
    console.log('Test DB API: Starting test')
    
    // Test database connection
    console.log('Test DB API: Connecting to database...')
    const client = await clientPromise
    console.log('Test DB API: Connected to database')
    
    const db = client.db('test')
    
    // List collections
    console.log('Test DB API: Listing collections...')
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    console.log('Test DB API: Found collections:', collectionNames)
    
    // Count projects
    const projectCount = await db.collection('projects').countDocuments({})
    console.log(`Test DB API: Found ${projectCount} projects`)
    
    // Get first project as a test
    const project = await db.collection('projects').findOne({})
    const projectSample = project ? {
      id: project._id.toString(),
      title: project.title || 'Unknown'
    } : null
    
    return NextResponse.json({
      status: 'Connected to MongoDB',
      collections: collectionNames,
      projectCount,
      projectSample
    })
  } catch (error) {
    console.error('Test DB API: Error connecting to MongoDB:', error)
    
    return NextResponse.json({
      status: 'Error',
      error: String(error)
    }, { status: 500 })
  }
} 
