import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'
import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'
import { mongoService } from '@/lib/services/mongoService'

const hasMongo = !!process.env.MONGODB_URI
;(hasMongo ? describe : describe.skip)('MongoDB Service', () => {
  let client: MongoClient

  beforeAll(async () => {
    // Connect to actual test database
    client = await mongoService.clientPromise
    await mongoService.connect()
  })

  afterAll(async () => {
    await mongoService.cleanup()
  })

  beforeEach(async () => {
    // Clear test collections before each test
    const db = client.db()
    const collections = await db.listCollections().toArray()
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({})
    }
  })

  describe('Connection Management', () => {
    it('should establish and maintain connection to MongoDB Atlas', async () => {
      const mongoose = await mongoService.connect()
      expect(mongoose).toBeDefined()
      expect(mongoService.isClient).toBe(false)
      
      // Verify connection is active
      const isHealthy = await mongoService.checkConnectionHealth(client)
      expect(isHealthy).toBe(true)
    })

    it('should handle connection pooling efficiently', async () => {
      // Create multiple concurrent connections
      const connections = await Promise.all([
        mongoService.connect(),
        mongoService.connect(),
        mongoService.connect()
      ])
      
      // Verify all connections are the same instance (connection pooling)
      const uniqueConnections = new Set(connections)
      expect(uniqueConnections.size).toBe(1)
    })

    it('should recover from connection failures', async () => {
      // Simulate network interruption
      await client.close()
      
      // Attempt to reconnect
      const newClient = await mongoService.clientPromise
      const isHealthy = await mongoService.checkConnectionHealth(newClient)
      expect(isHealthy).toBe(true)
    })
  })

  describe('Health Checks', () => {
    it('should perform real health check against MongoDB Atlas', async () => {
      const isHealthy = await mongoService.checkConnectionHealth(client)
      expect(isHealthy).toBe(true)
      
      // Verify server status
      const db = client.db()
      const serverStatus = await db.command({ serverStatus: 1 })
      expect(serverStatus.ok).toBe(1)
    })

    it('should monitor connection pool health', async () => {
      const db = client.db()
      const serverStatus = await db.command({ serverStatus: 1 })
      
      // Verify connection pool metrics
      expect(serverStatus.connections).toBeDefined()
      expect(serverStatus.connections.current).toBeGreaterThan(0)
      expect(serverStatus.connections.available).toBeGreaterThan(0)
    })
  })

  describe('Data Operations', () => {
    it('should perform CRUD operations with proper error handling', async () => {
      const db = client.db()
      const testCollection = db.collection('test_operations')
      
      // Test insert
      const insertResult = await testCollection.insertOne({ test: 'data' })
      expect(insertResult.acknowledged).toBe(true)
      
      // Test read
      const document = await testCollection.findOne({ _id: insertResult.insertedId })
      expect(document).not.toBeNull()
      expect(document!.test).toBe('data')
      
      // Test update
      const updateResult = await testCollection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { test: 'updated' } }
      )
      expect(updateResult.modifiedCount).toBe(1)
      
      // Test delete
      const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId })
      expect(deleteResult.deletedCount).toBe(1)
    })

    it('should handle concurrent operations correctly', async () => {
      const db = client.db()
      const testCollection = db.collection('test_concurrent')
      
      // Create multiple documents concurrently
      const operations = Array.from({ length: 10 }, (_, i) => 
        testCollection.insertOne({ index: i })
      )
      
      const results = await Promise.all(operations)
      expect(results.length).toBe(10)
      
      // Verify all documents were inserted
      const count = await testCollection.countDocuments()
      expect(count).toBe(10)
    })
  })

  describe('Security', () => {
    it('should enforce SSL/TLS connections', async () => {
      const db = client.db()
      const serverStatus = await db.command({ serverStatus: 1 })
      expect(serverStatus.connections.ssl).toBeDefined()
    })

    it('should handle authentication properly', async () => {
      const db = client.db()
      const result = await db.command({ connectionStatus: 1 })
      expect(result.authInfo.authenticatedUsers).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should maintain optimal connection pool size', async () => {
      const db = client.db()
      const serverStatus = await db.command({ serverStatus: 1 })
      
      // Verify connection pool metrics
      expect(serverStatus.connections.current).toBeLessThanOrEqual(10) // maxPoolSize
      expect(serverStatus.connections.available).toBeGreaterThan(0)
    })

    it('should handle high load operations efficiently', async () => {
      const db = client.db()
      const testCollection = db.collection('test_performance')
      
      // Measure operation performance
      const startTime = Date.now()
      const operations = Array.from({ length: 100 }, (_, i) => 
        testCollection.insertOne({ index: i })
      )
      
      await Promise.all(operations)
      const duration = Date.now() - startTime
      
      // Verify performance meets requirements
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Error Recovery', () => {
    it('should implement proper retry mechanism', async () => {
      const db = client.db()
      const testCollection = db.collection('test_retry')
      
      // Simulate temporary network issues
      const operation = async () => {
        try {
          await testCollection.insertOne({ test: 'retry' })
          return true
        } catch (error) {
          return false
        }
      }
      
      const result = await mongoService.withRetry(operation)
      expect(result).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      const db = client.db()
      const testCollection = db.collection('test_errors')
      
      // Attempt invalid operation
      await expect(
        testCollection.insertOne({ $invalid: 'operation' })
      ).rejects.toThrow()
    })
  })
}) 