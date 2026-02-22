/**
 * Client-only helper for keyword generation. Calls /api/ai/generate-keywords.
 * Do not import server-only modules (db, anthropicConfig, etc.) here.
 */

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
  const response = await fetch('/api/ai/generate-keywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      title,
      description,
      ...(ideation && Object.values(ideation).some(Boolean) ? { ideation } : {}),
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error((errorData as { message?: string }).message || 'Failed to generate keywords')
  }

  const data = (await response.json()) as { keywords?: string[] }
  return data.keywords ?? []
}
