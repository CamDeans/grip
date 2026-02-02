import { Phase } from '@/types/chat'
import styles from './ProgressTracker.module.css'
import { cn } from '@/lib/utils'

interface ProgressTrackerProps {
  phases: Phase[]
}

export function ProgressTracker({ phases }: ProgressTrackerProps) {
  // Calculate overall progress
  const totalSteps = phases.reduce((acc, phase) => acc + phase.steps.length, 0)
  const completedSteps = phases.reduce(
    (acc, phase) =>
      acc +
      phase.steps.filter(step => step.status === 'completed').length,
    0
  )
  const overallProgress = Math.round((completedSteps / totalSteps) * 100)

  // Calculate phase progress
  const phaseProgress = phases.map(phase => {
    const totalPhaseSteps = phase.steps.length
    const completedPhaseSteps = phase.steps.filter(
      step => step.status === 'completed'
    ).length
    const progress = Math.round((completedPhaseSteps / totalPhaseSteps) * 100)

    return {
      name: phase.name,
      progress,
      status: phase.status,
      completedSteps: completedPhaseSteps,
      totalSteps: totalPhaseSteps
    }
  })

  return (
    <div className="bg-background-tertiary/50 p-4 rounded-lg border border-border-default">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Project Progress</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1 h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                styles.progressBar,
                'bg-primary-500',
                `w-[${overallProgress}%]`
              )}
            />
          </div>
          <span className="text-sm font-medium">{overallProgress}%</span>
        </div>
        <p className="text-sm text-text-secondary mt-1">
          {completedSteps} of {totalSteps} steps completed
        </p>
      </div>

      <div className="space-y-4">
        {phaseProgress.map((phase, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{phase.name}</span>
              <span className="text-sm text-text-secondary">
                {phase.completedSteps}/{phase.totalSteps}
              </span>
            </div>
            <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  styles.phaseProgressBar,
                  phase.status === 'completed'
                    ? styles.completed
                    : phase.status === 'in_progress'
                    ? styles.inProgress
                    : styles.pending,
                  `w-[${phase.progress}%]`
                )}
              />
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={cn(
                  styles.statusDot,
                  phase.status === 'completed'
                    ? styles.completed
                    : phase.status === 'in_progress'
                    ? styles.inProgress
                    : styles.pending
                )}
              />
              <span className="text-xs text-text-secondary">
                {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 