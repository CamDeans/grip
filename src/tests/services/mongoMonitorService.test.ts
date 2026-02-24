import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'
import { mongoMonitorService } from '@/lib/services/mongoMonitorService'
import { mongoService } from '@/lib/services/mongoService'

const hasMongo = !!process.env.MONGODB_URI
;(hasMongo ? describe : describe.skip)('MongoDB Monitor Service', () => {
  beforeAll(async () => {
    // Connect to actual test database
    await mongoService.connect()
  })

  afterAll(async () => {
    await mongoService.cleanup()
    mongoMonitorService.stopMonitoring()
  })

  beforeEach(() => {
    mongoMonitorService.stopMonitoring()
  })

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring with actual database connection', () => {
      mongoMonitorService.startMonitoring()
      
      // Verify monitoring is active
      const metrics = mongoMonitorService.getMetrics()
      expect(metrics.isHealthy).toBe(true)
    })

    it('should stop monitoring and clean up resources', () => {
      mongoMonitorService.startMonitoring()
      mongoMonitorService.stopMonitoring()
      
      // Verify monitoring is stopped
      const metrics = mongoMonitorService.getMetrics()
      expect(metrics.activeConnections).toBe(0)
    })
  })

  describe('Metrics Collection', () => {
    it('should collect real metrics from MongoDB Atlas', async () => {
      mongoMonitorService.startMonitoring()
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const metrics = mongoMonitorService.getMetrics()
      expect(metrics.activeConnections).toBeGreaterThan(0)
      expect(metrics.memoryUsage).toBeGreaterThan(0)
      expect(metrics.isHealthy).toBe(true)
    })

    it('should track operation metrics during data operations', async () => {
      mongoMonitorService.startMonitoring()
      
      // Perform test operations
      const client = await mongoService.clientPromise
      const db = client.db()
      const testCollection = db.collection('test_metrics')
      
      // Insert test data
      await testCollection.insertOne({ test: 'data' })
      
      // Wait for metrics update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const metrics = mongoMonitorService.getMetrics()
      expect(metrics.operationCount).toBeGreaterThan(0)
    })
  })

  describe('Health Checks', () => {
    it('should perform real health check against MongoDB Atlas', async () => {
      mongoMonitorService.startMonitoring()
      
      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const metrics = mongoMonitorService.getMetrics()
      expect(metrics.isHealthy).toBe(true)
      expect(metrics.lastHealthCheck).toBeInstanceOf(Date)
    })

    it('should detect and report connection issues', async () => {
      mongoMonitorService.startMonitoring()
      
      // Simulate connection issue
      const client = await mongoService.clientPromise
      await client.close()
      
      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const alerts = mongoMonitorService.getAlerts()
      expect(alerts.some(alert => alert.type === 'error')).toBe(true)
    })
  })

  describe('Alert System', () => {
    it('should create alerts for actual threshold violations', async () => {
      mongoMonitorService.startMonitoring()
      
      // Perform operations to trigger thresholds
      const client = await mongoService.clientPromise
      const db = client.db()
      const testCollection = db.collection('test_alerts')
      
      // Create high load to trigger connection count alert
      const operations = Array.from({ length: 150 }, (_, i) => 
        testCollection.insertOne({ index: i })
      )
      
      await Promise.all(operations)
      
      // Wait for metrics update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const alerts = mongoMonitorService.getAlerts()
      expect(alerts.some(alert => alert.type === 'warning')).toBe(true)
    })

    it('should maintain alert history with proper cleanup', async () => {
      // Create multiple alerts
      for (let i = 0; i < 1100; i++) {
        mongoMonitorService['createAlert']('info', `Test alert ${i}`)
      }
      
      const alerts = mongoMonitorService.getAlerts()
      expect(alerts.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Event Handling', () => {
    it('should handle real connection events', async () => {
      const alertHandler = jest.fn()
      mongoMonitorService.onAlert(alertHandler)
      
      mongoMonitorService.startMonitoring()
      
      // Simulate connection issue
      const client = await mongoService.clientPromise
      await client.close()
      
      // Wait for event handling
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(alertHandler).toHaveBeenCalled()
    })

    it('should emit metrics events with real data', async () => {
      const metricsHandler = jest.fn()
      mongoMonitorService.onMetrics(metricsHandler)
      
      mongoMonitorService.startMonitoring()
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(metricsHandler).toHaveBeenCalled()
      const metrics = metricsHandler.mock.calls[0][0]
      expect(metrics.activeConnections).toBeGreaterThan(0)
    })
  })

  describe('Performance Monitoring', () => {
    it('should track response times for operations', async () => {
      mongoMonitorService.startMonitoring()
      
      // Perform test operations
      const client = await mongoService.clientPromise
      const db = client.db()
      const testCollection = db.collection('test_performance')
      
      const startTime = Date.now()
      await testCollection.insertOne({ test: 'performance' })
      const duration = Date.now() - startTime
      
      // Wait for metrics update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const metrics = mongoMonitorService.getMetrics()
      expect(metrics.averageResponseTime).toBeGreaterThan(0)
      expect(duration).toBeLessThan(1000) // Operation should complete within 1 second
    })

    it('should monitor memory usage under load', async () => {
      mongoMonitorService.startMonitoring()
      
      // Create high load
      const client = await mongoService.clientPromise
      const db = client.db()
      const testCollection = db.collection('test_memory')
      
      const operations = Array.from({ length: 1000 }, (_, i) => 
        testCollection.insertOne({ 
          index: i,
          data: 'x'.repeat(1000) // Create larger documents
        })
      )
      
      await Promise.all(operations)
      
      // Wait for metrics update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const metrics = mongoMonitorService.getMetrics()
      expect(metrics.memoryUsage).toBeGreaterThan(0)
    })
  })
}) 