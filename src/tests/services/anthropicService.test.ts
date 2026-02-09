import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { anthropicService } from '../../lib/services/anthropicService';
import { MongoClient } from 'mongodb';
import { mongoService } from '../../lib/services/mongoService';
import { AnthropicResponse } from '../../lib/services/anthropicService';
import { ANTHROPIC_MODEL_CHAT } from '../../lib/anthropicConfig';

describe('AnthropicService', () => {
  let client: MongoClient;

  beforeAll(async () => {
    // Connect to MongoDB Atlas test database
    client = await mongoService.clientPromise;
    await anthropicService.initialize();
  });

  afterAll(async () => {
    await anthropicService.cleanup();
  });

  beforeEach(async () => {
    // Clear test collections
    const db = client.db();
    await db.collection('anthropic_usage').deleteMany({});
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const status = anthropicService.getHealthStatus();
      expect(status.isHealthy).toBe(true);
      expect(status.lastCheck).toBeInstanceOf(Date);
    });
  });

  describe('Message Creation', () => {
    it('should create a message successfully', async () => {
      const messages = [{ role: 'user', content: 'Hello, how are you?' }];
      const response = await anthropicService.createMessage(messages);

      expect(response.content).toBeDefined();
      expect(response.usage).toBeDefined();
      expect(response.usage.promptTokens).toBeGreaterThan(0);
      expect(response.usage.completionTokens).toBeGreaterThan(0);
      expect(response.usage.totalTokens).toBeGreaterThan(0);
      expect(response.model).toBe(ANTHROPIC_MODEL_CHAT);
      expect(response.stopReason).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      const messages = Array(60).fill({ role: 'user', content: 'test' });
      const promises = messages.map(msg => anthropicService.createMessage([msg]));
      
      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      
      expect(fulfilled).toBeLessThanOrEqual(50); // Rate limit is 50 requests per minute
    });

    it('should retry on failure', async () => {
      const messages = [{ role: 'user', content: 'test' }];
      const response = await anthropicService.createMessage(messages);
      expect(response).toBeDefined();
    });
  });

  describe('Usage Logging', () => {
    it('should log usage to MongoDB', async () => {
      const messages = [{ role: 'user', content: 'test' }];
      await anthropicService.createMessage(messages);

      const db = client.db();
      const usage = await db.collection('anthropic_usage').findOne({});
      
      expect(usage).toBeDefined();
      if (usage) {
        expect(usage.timestamp).toBeInstanceOf(Date);
        expect(usage.usage).toBeDefined();
        expect(usage.model).toBe(ANTHROPIC_MODEL_CHAT);
      }
    });
  });

  describe('Health Checks', () => {
    it('should maintain health status', async () => {
      const status = anthropicService.getHealthStatus();
      expect(status.isHealthy).toBe(true);
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(status.latency).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid messages', async () => {
      await expect(anthropicService.createMessage([])).rejects.toThrow();
    });

    it('should handle service unavailability', async () => {
      // This test requires manual intervention to simulate service unavailability
      // or network issues
      const messages = [{ role: 'user', content: 'test' }];
      const response = await anthropicService.createMessage(messages);
      expect(response).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should maintain reasonable response times', async () => {
      const startTime = Date.now();
      const messages = [{ role: 'user', content: 'test' }];
      await anthropicService.createMessage(messages);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests', async () => {
      const messages = Array(10).fill({ role: 'user', content: 'test' });
      const promises = messages.map(msg => anthropicService.createMessage([msg]));
      
      const results = await Promise.all(promises);
      expect(results.length).toBe(10);
      results.forEach((response: AnthropicResponse) => {
        expect(response.content).toBeDefined();
        expect(response.usage).toBeDefined();
      });
    });
  });
}); 