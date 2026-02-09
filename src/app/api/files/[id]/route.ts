import { NextRequest, NextResponse } from 'next/server'
import { getFileById, updateFile, deleteFile } from '@/lib/services/fileStorageService'

/**
 * GET /api/files/[id]
 * Get a specific file by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await params
  try {
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'File ID is required'
        },
        { status: 400 }
      )
    }
    
    // Get file
    const file = await getFileById(fileId)
    
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'File not found'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      file: {
        fileId: file._id?.toString() || '',
        projectId: file.projectId.toString(),
        path: file.path,
        filename: file.filename,
        content: file.content,
        language: file.language,
        size: file.size,
        version: file.version,
        metadata: file.metadata,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }
    })
  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch file'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/files/[id]
 * Update a file's content
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await params
  try {
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'File ID is required'
        },
        { status: 400 }
      )
    }
    
    // Get request body
    const body = await request.json()
    
    if (!body.content) {
      return NextResponse.json(
        {
          success: false,
          error: 'File content is required'
        },
        { status: 400 }
      )
    }
    
    // Update file
    const updatedFile = await updateFile(fileId, {
      content: body.content,
      changeDescription: body.changeDescription || 'Updated via API',
      dependencies: body.dependencies,
      imports: body.imports,
      exports: body.exports
    })
    
    if (!updatedFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update file'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      file: {
        fileId: updatedFile._id?.toString() || '',
        version: updatedFile.version,
        updatedAt: updatedFile.updatedAt
      }
    })
  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update file'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/files/[id]
 * Delete a file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await params
  try {
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: 'File ID is required'
        },
        { status: 400 }
      )
    }
    
    // Delete file
    const success = await deleteFile(fileId)
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete file'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file'
      },
      { status: 500 }
    )
  }
} 