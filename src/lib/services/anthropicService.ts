import { Anthropic } from '@anthropic-ai/sdk'
import { EventEmitter } from 'events'
import { RateLimiter } from 'limiter'
import { MongoClient } from 'mongodb'
import { mongoService } from './mongoService'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT, ANTHROPIC_MODEL_FAST } from '@/lib/anthropicConfig'

// Constants
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second
const RATE_LIMIT = 50 // requests per minute
const HEALTH_CHECK_INTERVAL = 60000 // 1 minute

// Types
export type AnthropicConfig = {
  apiKey: string
  model: string
  maxTokens?: number
  temperature?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export type AnthropicResponse = {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  stopReason: string
}

export type AnthropicHealthStatus = {
  isHealthy: boolean
  lastCheck: Date
  error?: string
  latency?: number
}

// Service class
class AnthropicService extends EventEmitter {
  private client: Anthropic
  private config: AnthropicConfig
  private healthStatus: AnthropicHealthStatus
  private rateLimiter: RateLimiter
  private retryCount: number = 0
  private isInitialized: boolean = false

  constructor(config: AnthropicConfig) {
    super()
    this.config = config
    this.client = new Anthropic({ apiKey: config.apiKey })
    this.healthStatus = {
      isHealthy: true,
      lastCheck: new Date()
    }
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: RATE_LIMIT,
      interval: 'minute'
    })
  }

  // Initialize service
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Validate API key
      await this.validateApiKey()
      
      // Start health check
      this.startHealthCheck()
      
      // Initialize MongoDB connection
      await mongoService.connect()
      
      this.isInitialized = true
      this.emit('initialized')
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  // Validate API key (use a stable model for the ping so deprecated main model doesn't break init)
  private async validateApiKey(): Promise<void> {
    try {
      await this.client.messages.create({
        model: ANTHROPIC_MODEL_FAST,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error('Anthropic API key validation failed:', msg)
      throw new Error(`Anthropic API key invalid or unreachable: ${msg}`)
    }
  }

  // Health check
  private async checkHealth(): Promise<void> {
    const startTime = Date.now()
    try {
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'health check' }]
      })
      
      this.healthStatus = {
        isHealthy: true,
        lastCheck: new Date(),
        latency: Date.now() - startTime
      }
    } catch (error) {
      this.healthStatus = {
        isHealthy: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      }
      this.emit('healthCheckFailed', error)
    }
  }

  // Start health check interval
  private startHealthCheck(): void {
    setInterval(() => this.checkHealth(), HEALTH_CHECK_INTERVAL)
  }

  // Rate limiting
  private async waitForRateLimit(): Promise<void> {
    const hasToken = await this.rateLimiter.tryRemoveTokens(1)
    if (!hasToken) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return this.waitForRateLimit()
    }
  }

  // Retry mechanism
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (this.retryCount < MAX_RETRIES) {
        this.retryCount++
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return this.withRetry(operation)
      }
      throw error
    }
  }

  // Create message with validation
  async createMessage(
    messages: Array<{ role: string; content: string }>,
    options?: { system?: string; maxTokens?: number }
  ): Promise<AnthropicResponse> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized')
    }

    await this.waitForRateLimit()

    return this.withRetry(async () => {
      const maxTokens = options?.maxTokens ?? this.config.maxTokens ?? 8192
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        temperature: this.config.temperature || 0.7,
        top_p: this.config.topP,
        top_k: this.config.topK,
        system: options?.system,
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      })

      // Validate response
      if (!response.content || !Array.isArray(response.content) || response.content.length === 0 || !response.usage) {
        throw new Error('Invalid response from Anthropic API')
      }

      // Concatenate all text blocks (API can return multiple blocks)
      const content = response.content
        .filter((block: { type?: string; text?: string }) => block?.type === 'text' && typeof block?.text === 'string')
        .map((block: { text: string }) => block.text)
        .join('')
        .trim()

      if (!content) {
        throw new Error('Empty response from Anthropic API')
      }

      // Validate GRIP identity in response
      if (content.toLowerCase().includes('claude') || content.toLowerCase().includes('anthropic')) {
        throw new Error('Response contains unauthorized identity references')
      }

      // Transform usage to match our type
      const usage = {
        promptTokens: response.usage.input_tokens || 0,
        completionTokens: response.usage.output_tokens || 0,
        totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0)
      }

      // Log usage to MongoDB
      await this.logUsage(usage)

      return {
        content: content,
        usage,
        model: response.model,
        stopReason: response.stop_reason || 'unknown'
      }
    })
  }

  // Log usage to MongoDB
  private async logUsage(usage: AnthropicResponse['usage']): Promise<void> {
    try {
      const client = await mongoService.clientPromise
      const db = client.db()
      await db.collection('anthropic_usage').insertOne({
        timestamp: new Date(),
        usage,
        model: this.config.model
      })
    } catch (error) {
      this.emit('error', error)
    }
  }

  // Get health status
  getHealthStatus(): AnthropicHealthStatus {
    return this.healthStatus
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.removeAllListeners()
    await mongoService.cleanup()
    this.isInitialized = false
  }
}

// Create singleton instance (key read at runtime so env is available)
function createAnthropicService() {
  const apiKey = getAnthropicApiKey() || ''
  return new AnthropicService({
    apiKey,
    model: ANTHROPIC_MODEL_CHAT,
    maxTokens: 8192,
    temperature: 0.7
  })
}
const anthropicService = createAnthropicService()

export { anthropicService, AnthropicService } 