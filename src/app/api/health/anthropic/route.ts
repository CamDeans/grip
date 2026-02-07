import { NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'

/**
 * Test Anthropic API connection.
 * GET /api/health/anthropic - returns 200 if ANTHROPIC_API_KEY is set and valid.
 * Use this to verify the app can reach Anthropic (chat, enhanced chat, AI features).
 */
export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json(
      {
        status: 'error',
        anthropic: 'disconnected',
        error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local (local) or Vercel Environment Variables (production).',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }

  const start = Date.now()
  try {
    const anthropic = new Anthropic({ apiKey })
    // Minimal request to validate key and connectivity (1 token response)
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say OK in one word.' }],
    })
    const latency = Date.now() - start
    return NextResponse.json(
      {
        status: 'ok',
        anthropic: 'connected',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Anthropic health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        anthropic: 'disconnected',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
