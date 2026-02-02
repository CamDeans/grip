import { EventEmitter } from 'events'
import { connectToDatabase } from '@/lib/mongodb'
import { MongoMonitorService } from './mongoMonitorService'

interface PerformanceMetrics {
  // System Metrics
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkLatency: number
  
  // Application Metrics
  responseTime: number
  requestCount: number
  errorRate: number
  activeConnections: number
  
  // MongoDB Metrics
  mongoMetrics: {
    connectionCount: number
    operationCount: number
    averageResponseTime: number
    isHealthy: boolean
  }
  
  // Timestamps
  lastUpdated: Date
  lastHealthCheck: Date
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'critical'
  message: string
  timestamp: Date
  details?: any
}

class PerformanceMonitorService {
  private static instance: PerformanceMonitorService
  private eventEmitter: EventEmitter
  private metrics: PerformanceMetrics
  private alerts: PerformanceAlert[]
  private monitoringInterval: NodeJS.Timeout | null
  private readonly MAX_ALERTS = 1000
  private readonly METRICS_INTERVAL = 60000 // 1 minute
  private readonly ALERT_THRESHOLDS = {
    cpuUsage: 0.8, // 80% CPU usage threshold
    memoryUsage: 0.8, // 80% memory usage threshold
    diskUsage: 0.9, // 90% disk usage threshold
    networkLatency: 1000, // 1 second network latency threshold
    responseTime: 1000, // 1 second response time threshold
    errorRate: 0.1, // 10% error rate threshold
    connectionCount: 100 // Max connection count threshold
  }

  private constructor() {
    this.eventEmitter = new EventEmitter()
    this.metrics = this.initializeMetrics()
    this.alerts = []
    this.monitoringInterval = null
  }

  public static getInstance(): PerformanceMonitorService {
    if (!PerformanceMonitorService.instance) {
      PerformanceMonitorService.instance = new PerformanceMonitorService()
    }
    return PerformanceMonitorService.instance
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkLatency: 0,
      responseTime: 0,
      requestCount: 0,
      errorRate: 0,
      activeConnections: 0,
      mongoMetrics: {
        connectionCount: 0,
        operationCount: 0,
        averageResponseTime: 0,
        isHealthy: true
      },
      lastUpdated: new Date(),
      lastHealthCheck: new Date()
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

    // Listen to MongoDB monitor events
    MongoMonitorService.getInstance().onMetrics((mongoMetrics) => {
      this.metrics.mongoMetrics = mongoMetrics
      this.checkThresholds()
    })
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Collect system metrics
      const systemMetrics = await this.getSystemMetrics()
      this.metrics = {
        ...this.metrics,
        ...systemMetrics,
        lastUpdated: new Date()
      }

      // Check thresholds and create alerts if needed
      this.checkThresholds()
    } catch (error) {
      this.createAlert('error', 'Failed to collect metrics', error)
    }
  }

  private async getSystemMetrics(): Promise<Partial<PerformanceMetrics>> {
    // In a real implementation, this would collect actual system metrics
    // For now, we'll use simulated metrics
    return {
      cpuUsage: Math.random() * 0.5, // Simulated CPU usage (0-50%)
      memoryUsage: Math.random() * 0.6, // Simulated memory usage (0-60%)
      diskUsage: Math.random() * 0.7, // Simulated disk usage (0-70%)
      networkLatency: Math.random() * 500, // Simulated network latency (0-500ms)
      responseTime: Math.random() * 800, // Simulated response time (0-800ms)
      requestCount: Math.floor(Math.random() * 1000), // Simulated request count
      errorRate: Math.random() * 0.05, // Simulated error rate (0-5%)
      activeConnections: Math.floor(Math.random() * 50) // Simulated active connections
    }
  }

  private checkThresholds(): void {
    // Check CPU usage
    if (this.metrics.cpuUsage > this.ALERT_THRESHOLDS.cpuUsage) {
      this.createAlert('warning', 'High CPU usage detected', { 
        cpuUsage: this.metrics.cpuUsage 
      })
    }

    // Check memory usage
    if (this.metrics.memoryUsage > this.ALERT_THRESHOLDS.memoryUsage) {
      this.createAlert('warning', 'High memory usage detected', { 
        memoryUsage: this.metrics.memoryUsage 
      })
    }

    // Check disk usage
    if (this.metrics.diskUsage > this.ALERT_THRESHOLDS.diskUsage) {
      this.createAlert('warning', 'High disk usage detected', { 
        diskUsage: this.metrics.diskUsage 
      })
    }

    // Check network latency
    if (this.metrics.networkLatency > this.ALERT_THRESHOLDS.networkLatency) {
      this.createAlert('warning', 'High network latency detected', { 
        networkLatency: this.metrics.networkLatency 
      })
    }

    // Check response time
    if (this.metrics.responseTime > this.ALERT_THRESHOLDS.responseTime) {
      this.createAlert('warning', 'High response time detected', { 
        responseTime: this.metrics.responseTime 
      })
    }

    // Check error rate
    if (this.metrics.errorRate > this.ALERT_THRESHOLDS.errorRate) {
      this.createAlert('error', 'High error rate detected', { 
        errorRate: this.metrics.errorRate 
      })
    }

    // Check connection count
    if (this.metrics.activeConnections > this.ALERT_THRESHOLDS.connectionCount) {
      this.createAlert('warning', 'High connection count detected', { 
        activeConnections: this.metrics.activeConnections 
      })
    }
  }

  private createAlert(type: PerformanceAlert['type'], message: string, details?: any): void {
    const alert: PerformanceAlert = {
      type,
      message,
      timestamp: new Date(),
      details
    }

    this.alerts.push(alert)
    
    // Maintain alert history limit
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS)
    }

    this.eventEmitter.emit('alert', alert)
  }

  private checkHealth(): void {
    const isHealthy = 
      this.metrics.cpuUsage < this.ALERT_THRESHOLDS.cpuUsage &&
      this.metrics.memoryUsage < this.ALERT_THRESHOLDS.memoryUsage &&
      this.metrics.diskUsage < this.ALERT_THRESHOLDS.diskUsage &&
      this.metrics.networkLatency < this.ALERT_THRESHOLDS.networkLatency &&
      this.metrics.responseTime < this.ALERT_THRESHOLDS.responseTime &&
      this.metrics.errorRate < this.ALERT_THRESHOLDS.errorRate &&
      this.metrics.activeConnections < this.ALERT_THRESHOLDS.connectionCount &&
      this.metrics.mongoMetrics.isHealthy

    if (!isHealthy) {
      this.createAlert('warning', 'System health check failed')
    }

    this.metrics.lastHealthCheck = new Date()
  }

  private emitMetrics(): void {
    this.eventEmitter.emit('metrics', { ...this.metrics })
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  public getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  public onMetrics(callback: (metrics: PerformanceMetrics) => void): void {
    this.eventEmitter.on('metrics', callback)
  }

  public onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.eventEmitter.on('alert', callback)
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }
}

export const performanceMonitorService = PerformanceMonitorService.getInstance() 