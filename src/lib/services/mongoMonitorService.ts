import { EventEmitter } from 'events'
import { MongoClient } from 'mongodb'
import { mongoService } from './mongoService'

interface MongoMetrics {
  connectionCount: number
  operationCount: number
  errorCount: number
  averageResponseTime: number
  activeConnections: number
  memoryUsage: number
  lastHealthCheck: Date
  isHealthy: boolean
}

interface MongoAlert {
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: Date
  details?: any
}

export class MongoMonitorService {
  private static instance: MongoMonitorService
  private eventEmitter: EventEmitter
  private metrics: MongoMetrics
  private alerts: MongoAlert[]
  private monitoringInterval: NodeJS.Timeout | null
  private readonly MAX_ALERTS = 1000
  private readonly METRICS_INTERVAL = 60000 // 1 minute
  private readonly ALERT_THRESHOLDS = {
    errorRate: 0.1, // 10% error rate threshold
    responseTime: 1000, // 1 second response time threshold
    memoryUsage: 0.8, // 80% memory usage threshold
    connectionCount: 100 // Max connection count threshold
  }

  private constructor() {
    this.eventEmitter = new EventEmitter()
    this.metrics = this.initializeMetrics()
    this.alerts = []
    this.monitoringInterval = null
  }

  public static getInstance(): MongoMonitorService {
    if (!MongoMonitorService.instance) {
      MongoMonitorService.instance = new MongoMonitorService()
    }
    return MongoMonitorService.instance
  }

  private initializeMetrics(): MongoMetrics {
    return {
      connectionCount: 0,
      operationCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      memoryUsage: 0,
      lastHealthCheck: new Date(),
      isHealthy: true
    }
  }

  public startMonitoring(): void {
    if (this.monitoringInterval) {
      return
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.checkHealth()
      this.emitMetrics()
    }, this.METRICS_INTERVAL)

    // Listen to MongoDB service events
    mongoService.eventEmitter.on('connectionError', this.handleConnectionError.bind(this))
    mongoService.eventEmitter.on('healthCheckFailed', this.handleHealthCheckFailed.bind(this))
    mongoService.eventEmitter.on('healthCheckPassed', this.handleHealthCheckPassed.bind(this))
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    // Remove event listeners
    mongoService.eventEmitter.removeAllListeners('connectionError')
    mongoService.eventEmitter.removeAllListeners('healthCheckFailed')
    mongoService.eventEmitter.removeAllListeners('healthCheckPassed')
  }

  private async collectMetrics(): Promise<void> {
    try {
      const client = await mongoService.clientPromise
      const db = client.db()
      
      // Get server status
      const serverStatus = await db.command({ serverStatus: 1 })
      
      // Update metrics
      this.metrics.activeConnections = serverStatus.connections.current
      this.metrics.memoryUsage = serverStatus.mem.resident / serverStatus.mem.virtual
      this.metrics.lastHealthCheck = new Date()
      
      // Check thresholds and create alerts if needed
      this.checkThresholds(serverStatus)
    } catch (error) {
      this.createAlert('error', 'Failed to collect metrics', error)
    }
  }

  private async checkHealth(): Promise<void> {
    try {
      const client = await mongoService.clientPromise
      const isHealthy = await mongoService.checkConnectionHealth(client)
      
      if (isHealthy) {
        this.handleHealthCheckPassed()
      } else {
        this.handleHealthCheckFailed()
      }
    } catch (error) {
      this.createAlert('error', 'Health check failed', error)
      this.handleHealthCheckFailed()
    }
  }

  private checkThresholds(serverStatus: any): void {
    const errorRate = this.metrics.errorCount / this.metrics.operationCount
    if (errorRate > this.ALERT_THRESHOLDS.errorRate) {
      this.createAlert('warning', 'High error rate detected', { errorRate })
    }

    if (this.metrics.averageResponseTime > this.ALERT_THRESHOLDS.responseTime) {
      this.createAlert('warning', 'High response time detected', { 
        averageResponseTime: this.metrics.averageResponseTime 
      })
    }

    if (this.metrics.memoryUsage > this.ALERT_THRESHOLDS.memoryUsage) {
      this.createAlert('warning', 'High memory usage detected', { 
        memoryUsage: this.metrics.memoryUsage 
      })
    }

    if (this.metrics.activeConnections > this.ALERT_THRESHOLDS.connectionCount) {
      this.createAlert('warning', 'High connection count detected', { 
        activeConnections: this.metrics.activeConnections 
      })
    }
  }

  private createAlert(type: 'error' | 'warning' | 'info', message: string, details?: any): void {
    const alert: MongoAlert = {
      type,
      message,
      timestamp: new Date(),
      details
    }

    this.alerts.push(alert)
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.shift()
    }

    this.eventEmitter.emit('alert', alert)
  }

  private handleConnectionError(error: Error): void {
    this.metrics.errorCount++
    this.createAlert('error', 'Connection error occurred', error)
  }

  private handleHealthCheckFailed(): void {
    this.metrics.isHealthy = false
    this.createAlert('error', 'Health check failed')
  }

  private handleHealthCheckPassed(): void {
    this.metrics.isHealthy = true
    this.createAlert('info', 'Health check passed')
  }

  private emitMetrics(): void {
    this.eventEmitter.emit('metrics', { ...this.metrics })
  }

  public getMetrics(): MongoMetrics {
    return { ...this.metrics }
  }

  public getAlerts(): MongoAlert[] {
    return [...this.alerts]
  }

  public onMetrics(callback: (metrics: MongoMetrics) => void): void {
    this.eventEmitter.on('metrics', callback)
  }

  public onAlert(callback: (alert: MongoAlert) => void): void {
    this.eventEmitter.on('alert', callback)
  }

  public removeMetricsListener(callback: (metrics: MongoMetrics) => void): void {
    this.eventEmitter.removeListener('metrics', callback)
  }

  public removeAlertListener(callback: (alert: MongoAlert) => void): void {
    this.eventEmitter.removeListener('alert', callback)
  }
}

export const mongoMonitorService = MongoMonitorService.getInstance() 