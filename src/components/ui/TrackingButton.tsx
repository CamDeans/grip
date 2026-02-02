import { forwardRef, useState } from 'react'
import { Button, ButtonProps } from '@/components/ui/Button'
import { useInteractionTracking } from '@/hooks/useInteractionTracking'
import { useParams } from 'next/navigation'

interface TrackingButtonProps extends ButtonProps {
  trackingPhase: string
  trackingStep: number
  trackingContext?: string
}

/**
 * TrackingButton - A button that automatically tracks clicks for the G.R.I.P. interaction tracking system
 * Extends the standard Button component with tracking capabilities
 */
const TrackingButton = forwardRef<HTMLButtonElement, TrackingButtonProps>(
  ({ 
    children, 
    trackingPhase, 
    trackingStep, 
    trackingContext = 'general', 
    onClick,
    disabled = false,
    ...props 
  }, ref) => {
    const params = useParams<{ id?: string }>()
    const projectId = params?.id
    const { trackButtonClick, isTracking } = useInteractionTracking(projectId)
    const [isTracked, setIsTracked] = useState(false)

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Don't track if already tracked (prevents double tracking)
      if (!isTracked) {
        setIsTracked(true)
        const buttonText = typeof children === 'string' 
          ? children 
          : JSON.stringify(children).substring(0, 50) // Simplified text representation
        
        // Track the button click
        await trackButtonClick(
          trackingPhase, 
          trackingStep, 
          buttonText, 
          trackingContext
        )
        
        setTimeout(() => setIsTracked(false), 500) // Reset after 500ms
      }
      
      // Call the original onClick handler if provided
      if (onClick) {
        onClick(e)
      }
    }

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || isTracking || isTracked}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

TrackingButton.displayName = 'TrackingButton'

export { TrackingButton } 