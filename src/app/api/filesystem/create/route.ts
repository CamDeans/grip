import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import { validatePath } from '@/lib/utils/security'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Received request body:', body)

    const dirPath = body.path
    if (!dirPath) {
      console.error('No path provided in request')
      return NextResponse.json(
        { error: 'No path provided' },
        { status: 400 }
      )
    }

    console.log('Attempting to validate path:', dirPath)
    // Normalize path separators for Windows
    const normalizedPath = dirPath.replace(/\//g, '\\')
    
    // Validate the path
    if (!validatePath(normalizedPath)) {
      console.error('Path validation failed:', normalizedPath)
      return NextResponse.json(
        { error: 'Invalid directory path' },
        { status: 400 }
      )
    }

    console.log('Creating directory at:', normalizedPath)
    // Create the directory
    await fs.mkdir(normalizedPath, { recursive: true })

    return NextResponse.json({ 
      success: true,
      path: normalizedPath
    })
  } catch (error) {
    console.error('Error creating directory:', error)
    return NextResponse.json(
      { error: 'Failed to create directory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 
