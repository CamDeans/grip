import { NextRequest, NextResponse } from 'next/server'
import { generateKeywordsServer } from '@/lib/services/aiService'
import { getServerSession } from 'next-auth/next'
import { rateLimit } from '@/lib/api-utils/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting to prevent abuse
    const limiter = await rateLimit('generate-keywords', 10, '1h')
    if (!limiter.success) {
      return NextResponse.json(
        { message: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { title, description } = body

    // Validate request data
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

    // Generate keywords using the server-side function
    const keywords = await generateKeywordsServer(title, description)

    // Return the generated keywords
    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('[API] Error generating keywords:', error)
    return NextResponse.json(
      { message: 'Failed to generate keywords' },
      { status: 500 }
    )
  }
} 