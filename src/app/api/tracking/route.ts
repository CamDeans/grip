import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { InteractionTrackingService } from '@/lib/services/interactionTrackingService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * API endpoint for tracking user interactions with the G.R.I.P. console
 * This tracks progress through development phases, button selections, planning results, and more
 */
export async function POST(request: Request) {
  try {
    // Get user session
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { projectId, action, data } = body

    if (!projectId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userId = session.user.id || session.user.email || 'unknown'

    // Process based on action type
    let result
    switch (action) {
      case 'track_progress':
        // Validate required fields
        if (!data.phase || typeof data.step !== 'number' || !data.action) {
          return NextResponse.json({ error: 'Missing required fields for track_progress' }, { status: 400 })
        }
        
        result = await InteractionTrackingService.trackDevelopmentProgress(
          projectId,
          userId,
          data.phase,
          data.step,
          data.action,
          data.status || 'started'
        )
        break

      case 'track_button':
        // Validate required fields
        if (!data.phase || typeof data.step !== 'number' || !data.buttonText || !data.context) {
          return NextResponse.json({ error: 'Missing required fields for track_button' }, { status: 400 })
        }
        
        result = await InteractionTrackingService.trackButtonSelection(
          projectId,
          userId,
          data.phase,
          data.step,
          data.buttonText,
          data.context
        )
        break

      case 'track_prompt':
        // Validate required fields
        if (!data.phase || typeof data.step !== 'number' || !data.prompt) {
          return NextResponse.json({ error: 'Missing required fields for track_prompt' }, { status: 400 })
        }
        
        result = await InteractionTrackingService.trackUserPrompt(
          projectId,
          userId,
          data.phase,
          data.step,
          data.prompt
        )
        break

      case 'record_planning':
        // Validate required fields
        if (!data.name || !data.fileHierarchy || !data.technicalSpecifications) {
          return NextResponse.json({ error: 'Missing required fields for record_planning' }, { status: 400 })
        }
        
        result = await InteractionTrackingService.recordPlanningResults(
          projectId,
          data.name,
          data.fileHierarchy,
          data.technicalSpecifications,
          data.planningNotes || '',
          data.repositoryId,
          data.analysisId,
          data.source || 'ai_generated'
        )
        break

      case 'create_dev_session':
        // Validate required fields
        if (!data.name || !data.sessionType || !data.phase || typeof data.step !== 'number') {
          return NextResponse.json({ error: 'Missing required fields for create_dev_session' }, { status: 400 })
        }
        
        result = await InteractionTrackingService.createDevelopmentSession(
          projectId,
          data.name,
          data.sessionType,
          data.phase,
          data.step,
          data.planningId,
          data.userInitiated || false
        )
        break

      case 'create_test_run':
        // Validate required fields
        if (!data.name || !data.testType || !data.framework || !data.testFiles || !data.testCommand || !data.environment) {
          return NextResponse.json({ error: 'Missing required fields for create_test_run' }, { status: 400 })
        }
        
        result = await InteractionTrackingService.createTestRun(
          projectId,
          data.name,
          data.testType,
          data.framework,
          data.testFiles,
          data.testCommand,
          data.environment,
          data.coverage || false,
          data.developmentSessionId,
          data.userInitiated || false
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Error tracking interaction:', error)
    return NextResponse.json(
      { error: 'Failed to track interaction' },
      { status: 500 }
    )
  }
}

/**
 * Get tracking data for a project
 */
export async function GET(request: Request) {
  try {
    // Get user session
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type') || 'progress'

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId parameter' }, { status: 400 })
    }

    const userId = session.user.id || session.user.email || 'unknown'

    // Process based on type
    let result
    switch (type) {
      case 'progress':
        result = await InteractionTrackingService.getDevelopmentProgress(projectId, userId)
        break

      case 'planning':
        result = await InteractionTrackingService.getLatestPlanningResults(projectId)
        break

      case 'sessions':
        result = await InteractionTrackingService.getActiveDevelopmentSessions(projectId)
        break

      case 'tests':
        const limit = parseInt(searchParams.get('limit') || '10', 10)
        result = await InteractionTrackingService.getTestRuns(projectId, limit)
        break

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Error getting tracking data:', error)
    return NextResponse.json(
      { error: 'Failed to get tracking data' },
      { status: 500 }
    )
  }
} 