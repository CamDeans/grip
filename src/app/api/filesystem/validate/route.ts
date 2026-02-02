import { NextResponse } from 'next/server'
import fs from 'fs/promises'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dirPath = searchParams.get('path')

    if (!dirPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    // Security check to ensure path is within allowed boundaries
    if (!dirPath.startsWith('C:/Users/camer/Documents')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const stats = await fs.stat(dirPath)
    
    return NextResponse.json({
      exists: true,
      isDirectory: stats.isDirectory()
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({
        exists: false,
        isDirectory: false
      })
    }
    
    console.error('Error validating path:', error)
    return NextResponse.json({ error: 'Failed to validate path' }, { status: 500 })
  }
} 
