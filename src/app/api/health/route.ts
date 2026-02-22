import { NextResponse } from 'next/server'
import clientPromise, { DB_NAME } from '@/lib/db'

/**
 * Health check for deployment and load balancers.
 * GET /api/health - returns 200 if app and DB are reachable.
 */
export async function GET() {
  try {
    const client = await clientPromise
    await client.db(DB_NAME).command({ ping: 1 })
    return NextResponse.json(
      { status: 'ok', database: 'connected', timestamp: new Date().toISOString() },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
