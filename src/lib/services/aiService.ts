import { Anthropic } from '@anthropic-ai/sdk'
import { getAnthropicApiKey, ANTHROPIC_MODEL_OPUS } from '@/lib/anthropicConfig'

// Don't use NEXT_PUBLIC_ for API keys to avoid exposing them to the client
// Instead, we'll create an API endpoint to handle this server-side
export type IdeationContext = {
  goals?: string
  targetAudience?: string
  keyFeatures?: string
  technicalRequirements?: string
}

export async function generateKeywords(
  title: string,
  description: string,
  ideation?: IdeationContext
): Promise<string[]> {
  try {
    const response = await fetch('/api/ai/generate-keywords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        ...(ideation && Object.values(ideation).some(Boolean) ? { ideation } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate keywords');
    }

    const data = await response.json();
    return data.keywords || [];
  } catch (error) {
    console.error('Error generating keywords:', error);
    throw new Error('Failed to generate keywords');
  }
}

export type GenerateKeywordsServerResult = { keywords: string[]; totalTokens: number }

export type IdeationContextServer = {
  goals?: string
  targetAudience?: string
  keyFeatures?: string
  technicalRequirements?: string
}

// Server-side helper: generate keywords that surface GitHub repos best aligned with the user's project
export async function generateKeywordsServer(
  title: string,
  description: string,
  ideation?: IdeationContextServer
): Promise<GenerateKeywordsServerResult> {
  try {
    const apiKey = getAnthropicApiKey()
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    const anthropic = new Anthropic({ apiKey })

    const hasIdeation = ideation && Object.values(ideation).some((v) => v && String(v).trim())

    const prompt = `You are helping a user find the best GitHub repository to use as a reference for their project. Generate 6–8 search keywords that will surface repos that strongly align with their project intent. The goal is the best possible repo match for their ideation.

Guidelines:
- Include framework, stack, or language terms when inferable (e.g. react, nextjs, typescript, tailwind, node).
- Include problem-domain and use-case terms (e.g. todo app, recipe, dashboard, ecommerce, auth).
- Prefer terms that match real repo topics and descriptions (e.g. starter, template, boilerplate, example, demo when relevant).
- Mix broad and specific terms so search results are relevant but not empty.
- Return ONLY a comma-separated list of keywords, no explanation.

Project Title: ${title}
Project Description: ${description}
${hasIdeation ? `
Additional context (use this to align keywords with their goals and features):
Goals: ${ideation!.goals?.trim() || '—'}
Target audience: ${ideation!.targetAudience?.trim() || '—'}
Key features: ${ideation!.keyFeatures?.trim() || '—'}
Technical requirements: ${ideation!.technicalRequirements?.trim() || '—'}
` : ''}

Example format:
nextjs, react, typescript, todo app, tailwind, authentication`

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_OPUS,
      max_tokens: 320,
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }],
    });

    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    // Handle Claude 3 response format
    if (response.content && response.content[0] && 'text' in response.content[0]) {
      const keywordsText = response.content[0].text.trim();

      if (!keywordsText) {
        throw new Error('No valid keywords generated');
      }

      // Parse comma-separated keywords and trim whitespace
      const keywords = keywordsText.split(',').map(keyword => keyword.trim()).filter(Boolean);

      if (keywords.length === 0) {
        return { keywords: ['repository'], totalTokens };
      }

      return { keywords, totalTokens };
    }

    throw new Error('Invalid response format from AI');
  } catch (error) {
    console.error('Error generating keywords:', error);
    return { keywords: ['repository'], totalTokens: 0 }; // Fallback keyword
  }
}
