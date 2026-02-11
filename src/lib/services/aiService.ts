import { Anthropic } from '@anthropic-ai/sdk'
import { getAnthropicApiKey, ANTHROPIC_MODEL_OPUS } from '@/lib/anthropicConfig'

// Don't use NEXT_PUBLIC_ for API keys to avoid exposing them to the client
// Instead, we'll create an API endpoint to handle this server-side
export async function generateKeywords(title: string, description: string): Promise<string[]> {
  try {
    // Call our secure API endpoint instead of directly using the Anthropic client
    const response = await fetch('/api/ai/generate-keywords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
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

// Server-side helper function for use in API routes
export async function generateKeywordsServer(title: string, description: string): Promise<GenerateKeywordsServerResult> {
  try {
    const apiKey = getAnthropicApiKey()
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_OPUS,
      max_tokens: 300,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: `Based on this project information, generate 5 relevant keywords that would be effective for searching GitHub repositories. The keywords should be specific and targeted. Return ONLY the keywords themselves as a comma-separated list without explanation.

Project Title: ${title}
Project Description: ${description}

Example response format:
nextjs, react, tailwind, authentication, dashboard`
      }]
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
