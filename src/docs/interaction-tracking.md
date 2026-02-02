# G.R.I.P. Interaction Tracking System

The G.R.I.P. Interaction Tracking System is a comprehensive solution for tracking and storing user interactions with the G.R.I.P. console. This system helps maintain context across sessions, analyze user behavior, and provide a better user experience.

## Features

- **Progress Tracking**: Track user progress through development phases
- **Button Click Tracking**: Record user selections and button clicks
- **User Prompt Tracking**: Store user prompts and questions
- **Planning Results**: Save detailed planning outputs, including file hierarchies and code structures
- **Development Sessions**: Track development work, including created files and modified files
- **Testing Results**: Store test runs, including test cases and results

## Collections

The system uses the following MongoDB collections to store interaction data:

- `developmentProgress`: Tracks user progress through development phases
- `planningResults`: Stores planning outputs for file hierarchies and code structures
- `developmentSession`: Records development phase work
- `testingResults`: Stores testing outputs and refinements

## Using the Tracking System

### React Hook

The easiest way to use the tracking system is through the `useInteractionTracking` hook:

```tsx
import { useInteractionTracking } from '@/hooks/useInteractionTracking';

function MyComponent({ projectId }) {
  const { 
    trackProgress, 
    trackButtonClick, 
    trackUserPrompt,
    recordPlanningResults,
    createDevelopmentSession,
    createTestRun,
    getTrackingData
  } = useInteractionTracking(projectId);

  // Track progress through a phase
  const handlePhaseCompletion = async () => {
    await trackProgress('design', 1, 'complete_design', 'completed');
  };

  // Track button clicks
  const handleButtonClick = async () => {
    await trackButtonClick('design', 1, 'Generate Code', 'code_generation');
  };

  // Get tracking data
  const loadProgress = async () => {
    const progress = await getTrackingData('progress');
    console.log('User progress:', progress);
  };
}
```

### TrackingButton Component

You can also use the `TrackingButton` component to automatically track button clicks:

```tsx
import { TrackingButton } from '@/components/ui/TrackingButton';

function MyComponent() {
  return (
    <TrackingButton
      trackingPhase="design"
      trackingStep={1}
      trackingContext="main_action"
      onClick={handleAction}
    >
      Generate Project
    </TrackingButton>
  );
}
```

### API Endpoints

The tracking system provides the following API endpoints:

#### POST /api/tracking

Tracks various user interactions:

```json
{
  "projectId": "project123",
  "action": "track_progress",
  "data": {
    "phase": "design",
    "step": 1,
    "action": "complete_design",
    "status": "completed"
  }
}
```

Supported actions:
- `track_progress`
- `track_button`
- `track_prompt`
- `record_planning`
- `create_dev_session`
- `create_test_run`

#### GET /api/tracking

Retrieves tracking data:

```
/api/tracking?projectId=project123&type=progress
```

Supported types:
- `progress`
- `planning`
- `sessions`
- `tests`

## Initialization

To initialize the MongoDB collections, run the following command:

```
npm run db:init
```

This script ensures all collections exist in the MongoDB database with proper validation.

## Integration with Chat Interface

The tracking system is integrated with the AI chat interface to automatically track user prompts and button selections. This allows the system to maintain context across sessions and provide a better user experience.

## Best Practices

1. **Track User Progress**: Always track user progress through development phases
2. **Record Button Selections**: Track button clicks to understand user preferences
3. **Store Planning Results**: Save planning outputs for future reference
4. **Link Related Data**: Connect planning, development, and testing data
5. **Use Tracking Analytics**: Analyze user interactions to improve the system 