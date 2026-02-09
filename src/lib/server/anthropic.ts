import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicApiKey } from '@/lib/anthropicConfig'

// Server-side only: use central config so all callers use latest model options
export function getAnthropicClient() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}
