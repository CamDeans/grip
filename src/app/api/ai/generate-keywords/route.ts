import { NextRequest, NextResponse } from 'next/server'
import { generateKeywordsServer } from '@/lib/services/aiService'
import { getServerAuthSession } from '@/lib/auth'
import { rateLimit } from '@/lib/api-utils/rate-limit'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const limiter = await rateLimit('generate-keywords', 10, '1h')
    if (!limiter.success) {
      return NextResponse.json(
        { message: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { title, description } = body

    if (!title || !description) {
      return NextResponse.json(
        { message: 'Missing required fields: title and description are required' },
        { status: 400 }
      )
    }

    if (title.length > 200 || description.length > 2000) {
      return NextResponse.json(
        { message: 'Input too long: title must be under 200 characters and description under 2000 characters' },
        { status: 400 }
      )
    }

    const { keywords, totalTokens } = await generateKeywordsServer(title, description)

    if (totalTokens > 0 && session.user?.id) {
      addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Generate keywords: failed to record token usage', err)
      )
    }

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('[API] Error generating keywords:', error)
    return NextResponse.json(
      { message: 'Failed to generate keywords' },
      { status: 500 }
    )
  }
} 