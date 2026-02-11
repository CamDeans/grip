import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getOrCloneRepository } from '@/lib/repository'
import { analyzeProject } from '@/lib/services/analysisService'
import { Project } from '@/lib/models/Project'
import { connectToDatabase } from '@/lib/mongodb'
import type { IProject } from '@/lib/models/Project'
import mongoose from 'mongoose'

export async function POST(req: Request) {
  try {
    console.log('Received project creation request')
    const session = await getServerAuthSession()
    
    if (!session?.user?.id) {
      console.error('Unauthorized: No user session found')
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No user session found' },
        { status: 401 }
      )
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const data = await req.json()
    console.log('Project creation data:', {
      ...data,
      userId: session.user.id
    })

    // Connect to database
    await connectToDatabase()
    console.log('Connected to database')

    // Create project with user ID
    const projectToCreate = {
      ...data,
      userId: session.user.id
    }

    // Validate required fields
    if (!projectToCreate.title?.trim() || !projectToCreate.description?.trim()) {
      console.error('Missing required fields:', {
        hasTitle: Boolean(projectToCreate.title?.trim()),
        hasDescription: Boolean(projectToCreate.description?.trim())
      })
      return NextResponse.json(
        { error: 'Validation failed', details: 'Title and description are required' },
        { status: 400 }
      )
    }

    // Create new project instance
    const project = new Project(projectToCreate)
    console.log('Created project instance:', JSON.stringify(project, null, 2))

    // Save the project
    try {
      const savedProject = await project.save()
      console.log('Project saved successfully:', JSON.stringify(savedProject, null, 2))

      // If repository is provided, analyze it
      if (projectToCreate.repository) {
        console.log('Starting repository analysis:', projectToCreate.repository)
        try {
          const analysisResult = await analyzeProject(savedProject._id, projectToCreate.repository)
          const totalTokens = analysisResult?.totalTokens ?? 0
          if (totalTokens > 0 && session.user?.id) {
            addTokenUsage(session.user.id, totalTokens).catch((err) =>
              console.warn('Project create (analyze): failed to record token usage', err)
            )
          }
          console.log('Repository analysis completed')
        } catch (error) {
          console.error('Repository analysis failed:', error)
          // Don't fail the whole request if analysis fails
        }
      }

      return NextResponse.json({ project: savedProject })
    } catch (saveError) {
      console.error('Error saving project:', {
        error: saveError,
        message: saveError instanceof Error ? saveError.message : 'Unknown error',
        stack: saveError instanceof Error ? saveError.stack : undefined
      })

      if (saveError instanceof mongoose.Error.ValidationError) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: Object.values(saveError.errors).map(err => ({
              field: (err as mongoose.Error.ValidatorError).path,
              message: (err as mongoose.Error.ValidatorError).message
            }))
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Failed to save project',
          details: saveError instanceof Error ? saveError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in project creation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied

    await connectToDatabase()
    const userId = session.user.id
    
    // Fetch both main projects and sandbox projects
    const mainProjects = await Project.find({ userId }).sort({ createdAt: -1 })
    const { listSandboxProjects } = await import('@/lib/services/sandboxProjectService')
    const sandboxProjects = await listSandboxProjects(userId)

    // Convert sandbox projects to unified format with isSandbox flag
    const unifiedProjects = [
      ...mainProjects.map((p: any) => ({ ...p.toObject(), isSandbox: false })),
      ...sandboxProjects.map((sp: any) => ({
        _id: sp._id,
        title: sp.title,
        description: sp.description,
        repository: sp.repository,
        ideation: sp.ideation,
        userId: sp.userId,
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
        status: 'active' as const,
        isSandbox: true,
        parentProjectId: sp.parentProjectId,
      })),
    ].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt).getTime()
      const bTime = new Date(b.updatedAt || b.createdAt).getTime()
      return bTime - aTime
    })

    // Dev-only: help debug "no projects locally" (same MONGODB_URI + same user id = same list)
    if (process.env.NODE_ENV === 'development') {
      const hint = process.env.MONGODB_URI
        ? `${process.env.MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://$2:****@').slice(0, 50)}...`
        : '(MONGODB_URI not set)'
      console.log(`[Projects GET] userId=${userId} main=${mainProjects.length} sandbox=${sandboxProjects.length} total=${unifiedProjects.length} uri=${hint}`)
    }

    return NextResponse.json({ projects: unifiedProjects })
  } catch (error: unknown) {
    console.error('Error fetching projects:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
