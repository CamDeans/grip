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

    const contents = await fs.readdir(dirPath, { withFileTypes: true })
    
    const items = contents.map(item => ({
      name: item.name,
      type: item.isDirectory() ? 'directory' : 'file'
    }))

    return NextResponse.json(items)
  } catch (error) {
    console.error('Error listing directory:', error)
    return NextResponse.json({ error: 'Failed to list directory' }, { status: 500 })
  }
} 
