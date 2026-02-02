import { NextResponse } from 'next/server'
import { TaskQueueService, ErrorRecoveryService } from '@/lib/services'
import TaskRunnerService from '@/lib/services/taskRunnerService'
import { getSystemState } from '@/lib/services/systemControlService'

let isInitialized = false

// Initialize background services
async function initializeServices() {
  if (isInitialized) return
  
  console.log('Initializing background services...')

  try {
    // Get or initialize system state
    const systemState = await getSystemState()
    
    // Initialize task queue with system settings
    if (systemState.isRunning) {
      TaskQueueService.initializeTaskQueue({ 
        concurrency: systemState.concurrencyLimit 
      })
      
      // Initialize task runner
      TaskRunnerService.initialize()
    } else {
      console.log('Task processing is disabled in system settings')
    }
    
    // Initialize error recovery service
    ErrorRecoveryService.initialize()
    
    isInitialized = true
    console.log('Background services initialized successfully')
  } catch (error) {
    console.error('Error during service initialization:', error)
    throw error
  }
}

// Initialize services when server starts
if (typeof window === 'undefined') {
  initializeServices().catch(error => {
    console.error('Failed to initialize services on startup:', error)
  })
}

// API route to manually trigger initialization (useful for serverless environments)
export async function GET() {
  try {
    await initializeServices()
    return NextResponse.json({ success: true, message: 'Services initialized successfully' })
  } catch (error) {
    console.error('Error initializing services:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initialize services' },
      { status: 500 }
    )
  }
}

// Reset services on server shutdown (only works in non-serverless environments)
const cleanupHandler = () => {
  if (isInitialized) {
    console.log('Shutting down background services...')
    TaskQueueService.stopTaskQueue()
    TaskRunnerService.shutdown()
    ErrorRecoveryService.shutdown()
    isInitialized = false
    console.log('Background services shut down successfully')
  }
}

// Register cleanup handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', cleanupHandler)
  process.on('SIGINT', cleanupHandler)
  
  // For nodemon or similar development tools
  process.on('SIGUSR2', cleanupHandler)
} 