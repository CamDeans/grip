import { connectToDatabase } from '@/lib/mongodb'
import { initializeTaskQueue, stopTaskQueue } from './taskQueueService'
import { SystemState } from '@/lib/models/SystemState'

/**
 * System Control Service - Implements administration controls for the automation system
 * Part of Phase 7, Step 5 of the G.R.I.P. AI Assistant Enhancement Plan
 */

// Default system state used on first initialization
const defaultSystemState = {
  isRunning: true,
  concurrencyLimit: 5,
  maxTasksPerProject: 10,
  taskPrioritization: 'priority',
  errorHandlingMode: 'retry',
  logLevel: 'info',
  allowHighPriorityOverride: true,
  maintenanceMode: false
}

/**
 * Get the current system state
 * @returns Current system state or default if not found
 */
export async function getSystemState(): Promise<any> {
  try {
    await connectToDatabase()
    
    // Get the current system state
    let state = await SystemState.findOne()
    
    // If no state exists, create the default one
    if (!state) {
      state = await SystemState.create({
        ...defaultSystemState,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      // Initialize task queue with default settings
      await initializeTaskQueue({ concurrency: defaultSystemState.concurrencyLimit })
      
      console.log('System state initialized with defaults')
    }
    
    return state
  } catch (error) {
    console.error('Error getting system state:', error)
    
    // Return default state if there was an error
    return {
      ...defaultSystemState,
      error: 'Error fetching actual state'
    }
  }
}

/**
 * Update the system state
 * @param updates Partial system state updates
 * @returns True if successful, false otherwise
 */
export async function updateSystemState(updates: Partial<any>): Promise<boolean> {
  try {
    await connectToDatabase()
    
    // Get current state or create if it doesn't exist
    let state = await SystemState.findOne()
    
    if (!state) {
      state = await SystemState.create({
        ...defaultSystemState,
        ...updates,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } else {
      // Only update allowable fields
      const allowedUpdates = [
        'concurrencyLimit',
        'maxTasksPerProject',
        'taskPrioritization',
        'errorHandlingMode',
        'logLevel',
        'allowHighPriorityOverride',
        'maintenanceMode'
      ]
      
      // Filter updates to only allowed fields
      const filteredUpdates = Object.entries(updates)
        .filter(([key]) => allowedUpdates.includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
      
      // Apply updates and set updated timestamp
      Object.assign(state, filteredUpdates, { updatedAt: new Date() })
      await state.save()
    }
    
    // Apply changes to task queue
    if (updates.concurrencyLimit) {
      // Restart queue with new concurrency if it was running
      if (state.isRunning) {
        await stopTaskQueue()
        await initializeTaskQueue({ concurrency: state.concurrencyLimit })
      }
    }
    
    return true
  } catch (error) {
    console.error('Error updating system state:', error)
    return false
  }
}

/**
 * Start the automation system
 * @returns True if successful, false otherwise
 */
export async function startSystem(): Promise<boolean> {
  try {
    await connectToDatabase()
    
    // Get current state
    const state = await SystemState.findOne()
    
    // Can't start if already running
    if (state?.isRunning) {
      console.log('System already running')
      return false
    }
    
    // Start task queue
    await initializeTaskQueue({ 
      concurrency: state?.concurrencyLimit || defaultSystemState.concurrencyLimit 
    })
    
    // Update state
    if (state) {
      state.isRunning = true
      state.updatedAt = new Date()
      await state.save()
    } else {
      // Create default state if not found
      await SystemState.create({
        ...defaultSystemState,
        isRunning: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    
    console.log('System started')
    return true
  } catch (error) {
    console.error('Error starting system:', error)
    return false
  }
}

/**
 * Pause the automation system
 * @returns True if successful, false otherwise
 */
export async function pauseSystem(): Promise<boolean> {
  try {
    await connectToDatabase()
    
    // Get current state
    const state = await SystemState.findOne()
    
    // Can't pause if already paused
    if (state && !state.isRunning) {
      console.log('System already paused')
      return false
    }
    
    // Stop task queue
    await stopTaskQueue()
    
    // Update state
    if (state) {
      state.isRunning = false
      state.updatedAt = new Date()
      await state.save()
    } else {
      // Create default state if not found
      await SystemState.create({
        ...defaultSystemState,
        isRunning: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    
    console.log('System paused')
    return true
  } catch (error) {
    console.error('Error pausing system:', error)
    return false
  }
} 