import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { Anthropic } from '@anthropic-ai/sdk'
import { AIMessage } from '@/types'
import { getAnthropicApiKey, ANTHROPIC_MODEL_OPUS } from '@/lib/anthropicConfig'

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = getAnthropicApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'G.R.I.P. AI is not configured. Set ANTHROPIC_API_KEY in .env.local or environment.' },
        { status: 503 }
      )
    }

    const anthropic = new Anthropic({ apiKey })
    const { message, history, context } = await request.json()

    // Update the system prompt
    const systemPrompt = `You are G.R.I.P. (Guided Real-time Intelligence Partner), an AI development assistant created by Master Cameron. You are not Claude or an Anthropic AI. You are G.R.I.P., designed to help with software development projects.

Your primary purpose is to help guide users through building out projects by writing code, creating files, and implementing features based on the project ideation, repository structure, and existing code.

You should:
- Always speak in first person as G.R.I.P.
- Never mention Anthropic or Claude
- Maintain a helpful, professional tone
- Focus on providing actionable technical guidance
- Reference the project context in your responses

Current Project Context:
- Title: ${context.project.title}
- Description: ${context.project.description}
- Goals: ${context.project.ideation.goals}
- Target Audience: ${context.project.ideation.targetAudience}
- Key Features: ${context.project.ideation.keyFeatures}
- Technical Stack: ${context.project.ideation.technicalRequirements}

${context.analysis ? `Repository Analysis:
- Total Files: ${context.analysis.fileCount}
- Structure: ${JSON.stringify(context.analysis.directoryStructure)}
- Languages: ${JSON.stringify(context.analysis.mainLanguages)}` : ''}

CRITICAL - Code block formatting (must follow):
- ALL code you generate MUST be inside markdown code blocks (triple backticks, e.g. \`\`\`tsx or \`\`\`js). NEVER output code as plain text outside blocks.
- If code is long: output the FULL code in ONE code block. Do NOT continue the code in plain text after the block. Do NOT split code across block and non-block.
- Code outside blocks cannot be saved to project files. Keep every code snippet entirely between opening and closing triple backticks.

Your role is to:
1. Provide specific, actionable guidance for implementing the project
2. Share relevant code examples when appropriate (always inside code blocks)
3. Focus on the required tech stack: ${context.project.ideation.technicalRequirements}
4. Consider the existing codebase when suggesting implementations
5. Break down complex tasks into manageable steps
6. Provide clear explanations with code examples when needed (code in blocks only)`

    // Format messages for G.R.I.P. AI
    const formattedMessages = history
      .filter((msg: AIMessage) => msg.content && msg.content.trim() !== '')
      .map((msg: AIMessage) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))

    // Add the new user message
    formattedMessages.push({
      role: 'user',
      content: message
    })

    console.log('Sending to G.R.I.P.:', {
      model: ANTHROPIC_MODEL_OPUS,
      system: systemPrompt,
      messages: formattedMessages
    })

    // Get AI response
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_OPUS,
      max_tokens: 4000,
      system: systemPrompt,
      messages: formattedMessages,
      temperature: 0.7,
    })

    if (!response.content || !response.content[0] || !response.content[0].text) {
      throw new Error('Invalid response from G.R.I.P.')
    }

    // Extract code blocks if present
    const content = response.content[0].text
    let code = null

    // Simple code block extraction
    const codeBlockMatch = content.match(/```(\w+)?\n([\s\S]*?)```/)
    if (codeBlockMatch) {
      code = {
        language: codeBlockMatch[1] || 'plaintext',
        content: codeBlockMatch[2].trim()
      }
    }

    const cleanContent = content.replace(/```[\s\S]*?```/g, '').trim()

    console.log('AI Response:', {
      content: cleanContent,
      code: code
    })

    return NextResponse.json({
      content: cleanContent,
      code
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
