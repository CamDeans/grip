import { NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'
import { getAnthropicApiKey, ANTHROPIC_MODEL_FAST, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'

/**
 * Test Anthropic API connection.
 * GET /api/health/anthropic - returns 200 if ANTHROPIC_API_KEY is set and valid.
 * Use this to verify the app can reach Anthropic (chat, enhanced chat, AI features).
 */
export async function GET() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) {
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
  const anthropic = new Anthropic({ apiKey })
  const payload = { max_tokens: 10, messages: [{ role: 'user', content: 'Say OK in one word.' }] as const }

  try {
    // Try fast model first (low cost); if 404 (model retired), fall back to chat model
    try {
      await anthropic.messages.create({
        model: ANTHROPIC_MODEL_FAST,
        ...payload,
      })
    } catch (fastErr: unknown) {
      const msg = fastErr instanceof Error ? fastErr.message : String(fastErr)
      const is404 =
        (fastErr && typeof fastErr === 'object' && 'status' in fastErr && (fastErr as { status?: number }).status === 404) ||
        /404|not_found|model:.*not found/i.test(msg)
      if (is404) {
        await anthropic.messages.create({
          model: ANTHROPIC_MODEL_CHAT,
          ...payload,
        })
      } else {
        throw fastErr
      }
    }
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
