import { useState } from 'react'

/**
 * Hook for tracking user interactions with the G.R.I.P. console
 * Provides methods to track progress, button clicks, user prompts, etc.
 */
export const useInteractionTracking = (projectId: string | null | undefined) => {
  const [isTracking, setIsTracking] = useState(false)
  const [trackingError, setTrackingError] = useState<string | null>(null)

  // Reset error state
  const resetError = () => setTrackingError(null)

  // Base tracking function
  const trackInteraction = async (action: string, data: any) => {
    if (!projectId) {
      setTrackingError('No project ID provided')
      return null
    }

    try {
      setIsTracking(true)
      setTrackingError(null)

      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          action,
          data
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to track interaction')
      }

      const result = await response.json()
      return result.result
    } catch (error) {
      console.error('Error tracking interaction:', error)
      setTrackingError(error instanceof Error ? error.message : 'Unknown error')
      return null
    } finally {
      setIsTracking(false)
    }
  }

  /**
   * Track progress through a development phase
   */
  const trackProgress = async (
    phase: string,
    step: number,
    action: string,
    status: 'started' | 'in_progress' | 'completed' | 'skipped' = 'started'
  ) => {
    return trackInteraction('track_progress', {
      phase,
      step,
      action,
      status
    })
  }

  /**
   * Track a button click
   */
  const trackButtonClick = async (
    phase: string,
    step: number,
    buttonText: string,
    context: string
  ) => {
    return trackInteraction('track_button', {
      phase,
      step,
      buttonText,
      context
    })
  }

  /**
   * Track a user prompt
   */
  const trackUserPrompt = async (
    phase: string,
    step: number,
    prompt: string
  ) => {
    return trackInteraction('track_prompt', {
      phase,
      step,
      prompt
    })
  }

  /**
   * Record planning results
   */
  const recordPlanningResults = async (
    name: string,
    fileHierarchy: {
      rootDirectory: string;
      structure: Array<{
        path: string;
        type: 'file' | 'directory';
        description?: string;
        purpose?: string;
        dependsOn?: string[];
        technologies?: string[];
      }>;
    },
    technicalSpecifications: {
      frameworks: string[];
      libraries: string[];
      apis: string[];
      databases: string[];
      devOps: string[];
      patterns: string[];
    },
    planningNotes: string = '',
    repositoryId?: string,
    analysisId?: string,
    source: 'user_input' | 'ai_generated' | 'hybrid' = 'ai_generated'
  ) => {
    return trackInteraction('record_planning', {
      name,
      fileHierarchy,
      technicalSpecifications,
      planningNotes,
      repositoryId,
      analysisId,
      source
    })
  }

  /**
   * Create a new development session
   */
  const createDevelopmentSession = async (
    name: string,
    sessionType: 'implementation' | 'refactoring' | 'feature' | 'bugfix' | 'testing',
    phase: string,
    step: number,
    planningId?: string,
    userInitiated: boolean = false
  ) => {
    return trackInteraction('create_dev_session', {
      name,
      sessionType,
      phase,
      step,
      planningId,
      userInitiated
    })
  }

  /**
   * Create a new test run
   */
  const createTestRun = async (
    name: string,
    testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility',
    framework: string,
    testFiles: string[],
    testCommand: string,
    environment: string,
    coverage: boolean = false,
    developmentSessionId?: string,
    userInitiated: boolean = false
  ) => {
    return trackInteraction('create_test_run', {
      name,
      testType,
      framework,
      testFiles,
      testCommand,
      environment,
      coverage,
      developmentSessionId,
      userInitiated
    })
  }

  /**
   * Get tracking data
   */
  const getTrackingData = async (
    type: 'progress' | 'planning' | 'sessions' | 'tests' = 'progress',
    limit?: number
  ) => {
    if (!projectId) {
      setTrackingError('No project ID provided')
      return null
    }

    try {
      setIsTracking(true)
      setTrackingError(null)

      let url = `/api/tracking?projectId=${projectId}&type=${type}`
      if (type === 'tests' && limit) {
        url += `&limit=${limit}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get tracking data')
      }

      const result = await response.json()
      return result.result
    } catch (error) {
      console.error('Error getting tracking data:', error)
      setTrackingError(error instanceof Error ? error.message : 'Unknown error')
      return null
    } finally {
      setIsTracking(false)
    }
  }

  return {
    trackProgress,
    trackButtonClick,
    trackUserPrompt,
    recordPlanningResults,
    createDevelopmentSession,
    createTestRun,
    getTrackingData,
    isTracking,
    trackingError,
    resetError
  }
} 