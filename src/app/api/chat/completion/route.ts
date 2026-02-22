import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import { clientPromise, DB_NAME } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { AIMessage, ProjectState, ChatResponse, ChatError, StepContext } from '@/types'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const apiKey = getAnthropicApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'G.R.I.P. AI is not configured. Set ANTHROPIC_API_KEY in .env.local or environment.' },
        { status: 503 }
      )
    }

    const { messages, projectId } = await request.json()

    if (!projectId || !messages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current project state
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const projectState = await db.collection('projectStates').findOne({
      projectId: new ObjectId(projectId)
    }) as ProjectState | null

    if (!projectState) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get current phase and step
    const currentPhase = projectState.currentPhase
    const currentPhaseObj = projectState.phases.find(p => p.name === currentPhase)
    const currentStep = currentPhaseObj?.steps.find(s => s.status === 'pending' || s.status === 'in_progress')

    // Generate AI response based on context
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL_CHAT,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are G.R.I.P. (GitHub Repo-Analysis Intellectual Partner), an AI development assistant created by Master Cameron. You are not Claude or an Anthropic AI. You are G.R.I.P., designed to help with software development projects.

Your primary purpose is to help guide users through building out projects by writing code, creating files, and implementing features based on the project ideation, repository structure, and existing code.

The current phase is ${currentPhase} and the current step is ${currentStep?.title || 'none'}. 
Provide helpful responses that guide the user through the project setup process while maintaining your identity as G.R.I.P.

Remember to:
- Always speak in first person as G.R.I.P.
- Never mention Anthropic or Claude
- Maintain a helpful, professional tone
- Focus on providing actionable technical guidance
- Reference the project context in your responses`
          },
          ...messages.map((msg: AIMessage) => ({
            role: msg.role,
            content: msg.content
          }))
        ]
      })
    })

    if (!response.ok) {
      throw new Error('Failed to get AI response')
    }

    const data = await response.json()
    const aiMessage = data.content[0].text

    const totalTokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)
    if (totalTokens > 0 && session.user?.id) {
      addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Chat completion: failed to record token usage', err)
      )
    }

    // Determine if the message indicates a step completion
    const stepContext: StepContext = {
      phase: currentPhase,
      stepId: currentStep?.id || 1,
      action: {
        type: 'step_update' as const,
        status: 'in_progress',
        message: 'Processing user request'
      }
    }

    // Check if the message indicates step completion
    if (aiMessage.toLowerCase().includes('completed') || aiMessage.toLowerCase().includes('finished')) {
      stepContext.action.status = 'completed'
      stepContext.action.message = 'Step completed successfully'
    }

    const chatResponse: ChatResponse = {
      message: aiMessage,
      stepContext
    }

    return NextResponse.json(chatResponse)
  } catch (error) {
    console.error('Error in chat completion:', error)
    const chatError: ChatError = {
      error: 'Failed to process chat message',
      status: 500
    }
    return NextResponse.json(chatError, { status: 500 })
  }
} 
