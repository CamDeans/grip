import { useEnhancedChat as useContextEnhancedChat } from '@/components/providers/EnhancedChatProvider'

// Phase 2, Step 1: Create hook for enhanced chat

/**
 * Custom hook for using the enhanced chat with project context
 * This extends the basic chat functionality with project context awareness
 * 
 * @returns The enhanced chat context
 */
export function useEnhancedChat() {
  const chat = useContextEnhancedChat()
  
  return {
    ...chat,
    // Add any additional functionality specifically for the hook here
    
    /**
     * Helper to get context summary for debugging
     */
    getContextSummary: () => {
      const { projectContext, analysisContext, fileContext, structureContext, buildContext } = chat
      
      return {
        projectAvailable: !!projectContext,
        projectName: projectContext?.title || 'N/A',
        analysisAvailable: !!analysisContext,
        filesAvailable: fileContext.length > 0,
        fileCount: fileContext.length,
        structureAvailable: !!structureContext,
        buildsAvailable: buildContext.length > 0,
        buildCount: buildContext.length
      }
    },
    
    /**
     * Send a message with an explicit context hint
     */
    sendMessageWithContext: async (content: string, contextHint: {
      requiresProject?: boolean;
      requiresAnalysis?: boolean;
      requiresFiles?: boolean;
      requiresStructure?: boolean;
      requiresBuilds?: boolean;
    }) => {
      if (!chat.contextEnabled) {
        // If context is disabled, just send the regular message
        return chat.sendMessage(content)
      }
      
      // Ensure we have all the required context before sending
      const needsRefresh = (
        (contextHint.requiresProject && !chat.projectContext) ||
        (contextHint.requiresAnalysis && !chat.analysisContext) ||
        (contextHint.requiresFiles && chat.fileContext.length === 0) ||
        (contextHint.requiresStructure && !chat.structureContext) ||
        (contextHint.requiresBuilds && chat.buildContext.length === 0)
      )
      
      if (needsRefresh) {
        await chat.refreshContext()
      }
      
      return chat.sendMessage(content)
    },

    /**
     * Send an initial task-specific message to the chat
     * Used to provide guidance based on which development step the user is working on
     */
    sendInitialTaskMessage: async (task: string | null) => {
      // Check if the task is valid and if we have project context
      if (!task || !chat.projectContext || !chat.contextEnabled) {
        console.log('Cannot send task message: missing task, project context, or context disabled');
        return;
      }
      
      // Check if we already have messages to avoid duplicating on refresh
      if (chat.messages.length > 0) {
        // Check if the first message is already a task-specific one
        const firstMessage = chat.messages[0];
        
        // Check for any existing task message with this task type
        const hasTaskMessage = chat.messages.some(msg => 
          msg.role === 'assistant' && 
          (msg.id === 'welcome-message' || (msg.id && msg.id.startsWith(`task-${task}`)))
        );
        
        if (hasTaskMessage) {
          console.log('Task-specific message already exists, skipping task message');
          return;
        }
      }
      
      let taskMessage = '';
      
      try {
        // Determine the appropriate task message
        switch (task) {
          case 'development':
            taskMessage = `Let's start developing the core features for "${chat.projectContext.title}". I'll help you build the main components and implement the key functionality. What feature would you like to work on first?`;
            break;
          case 'testing':
            taskMessage = `It's time to test and refine "${chat.projectContext.title}". I can help you create test cases, identify bugs, or improve the existing features. What aspect would you like to focus on testing first?`;
            break;
          case 'planning':
            taskMessage = `Let's plan out the architecture for "${chat.projectContext.title}". I'll help you design the component structure, data flow, and technical approach. What are your initial thoughts on the architecture?`;
            break;
          case 'deployment':
            taskMessage = `Let's prepare "${chat.projectContext.title}" for deployment. We can set up build processes, optimize performance, and configure environments. What deployment targets are you considering?`;
            break;
          default:
            console.log(`Unknown task type: ${task}`);
            return; // Don't send anything for unknown tasks
        }
        
        // Only add the initial task message if we have a message to send
        if (taskMessage) {
          chat.addMessage({
            id: `task-${task}-${Date.now()}`,
            role: 'assistant',
            content: taskMessage,
            timestamp: new Date()
          });
          
          console.log(`Added task-specific message for task: ${task}`);
        }
      } catch (error) {
        console.error('Error sending initial task message:', error);
        // Don't throw the error to avoid breaking the UI
        // We can silently fail here as this is just an enhancement
      }
    }
  }
} 