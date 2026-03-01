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

const TITLE_MAX = 200
const DESCRIPTION_MAX = 2000

export async function generateKeywords(
  title: string,
  description: string,
  ideation?: IdeationContext
): Promise<string[]> {
  if (title.length > TITLE_MAX || description.length > DESCRIPTION_MAX) {
    throw new Error(
      'Input too long: title must be under 200 characters and description under 2000 characters'
    )
  }
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
