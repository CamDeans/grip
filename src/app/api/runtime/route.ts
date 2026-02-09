import { NextResponse } from 'next/server'

/**
 * GET /api/runtime
 * Returns deployment context so the client can show appropriate messaging.
 * On Vercel: no persistent filesystem, so project terminal cannot run real npm install;
 * users should export the project and run commands locally.
 */
export async function GET() {
  const vercel = process.env.VERCEL === '1'
  return NextResponse.json({
    vercel,
    runtime: vercel ? 'vercel' : 'self-hosted',
  })
}
