import Anthropic from '@anthropic-ai/sdk'

// This file will only be imported on the server side
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
