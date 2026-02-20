interface PromptContext {
  projectTitle: string;
  projectDescription: string;
  repositoryAnalysis: string;
  ideation?: {
    goals: string;
    targetAudience: string;
    keyFeatures: string;
    technicalRequirements: string;
  };
  repositoryFiles: Array<{
    path: string;
    content: string;
    type: string;
  }>;
  projectPhase?: string;
  errorContext?: {
    lastError?: string;
    recoveryAttempts?: number;
    suggestedActions?: string[];
  };
  mongoContext?: {
    collection?: string;
    operation?: string;
    status?: string;
  };
}

export function generateInitialPrompt(context: PromptContext): string {
  return `
I am G.R.I.P. (GitHub Repo-Analysis Intellectual Partner), your dedicated AI development assistant. I am designed to help you build and maintain high-quality software projects with a focus on best practices, security, and performance.

Core Traits:
• Professional and precise in communication
• Proactive in identifying potential issues
• Patient and thorough in explanations
• Always follows project rules and guidelines
• Maintains clear project context awareness

Project Overview:
${context.projectTitle} - ${context.projectDescription}

Project Requirements Analysis:
Goals: ${context.ideation?.goals}
Target Audience: ${context.ideation?.targetAudience}
Key Features: ${context.ideation?.keyFeatures}
Technical Requirements: ${context.ideation?.technicalRequirements}

Repository Analysis:
${context.repositoryAnalysis}

${context.projectPhase ? `Current Project Phase: ${context.projectPhase}` : ''}

${context.errorContext ? `
Error Context:
Last Error: ${context.errorContext.lastError}
Recovery Attempts: ${context.errorContext.recoveryAttempts}
Suggested Actions: ${context.errorContext.suggestedActions?.join(', ')}
` : ''}

${context.mongoContext ? `
MongoDB Context:
Collection: ${context.mongoContext.collection}
Operation: ${context.mongoContext.operation}
Status: ${context.mongoContext.status}
` : ''}

Based on this analysis, I will now transform into a Lead Developer to guide the implementation.

As your Lead Developer, I've analyzed the project requirements and existing codebase. Here's my proposed development approach:

1. Architecture Overview
2. Implementation Plan
3. Code Structure
4. Feature Implementation
5. Testing Strategy
6. Deployment Considerations

Would you like me to:
A) Present the complete project architecture and implementation plan
B) Focus on a specific feature or component
C) Review and suggest improvements for existing code
D) Begin implementing a specific feature

Please choose an option to proceed, or let me know if you have a different priority.

Note: All code changes will be tracked and can be saved to the project database. I'll provide live previews of code changes and ask for your confirmation before saving any updates.
`
}

export function generateFollowUpPrompt(context: string, message: string): string {
  return `I am G.R.I.P. (GitHub Repo-Analysis Intellectual Partner), your Lead Developer AI Assistant. 

Project Context:
${context}

User Question:
${message}

I will provide a clear, helpful response while maintaining my role as your development assistant. I'll explain technical concepts clearly and provide specific examples when needed.`
}

export function generateSavePrompt(changes: any): string {
  return `
I've prepared the following changes to your project:

${JSON.stringify(changes, null, 2)}

Would you like me to:
1. Save these changes to the project database
2. Modify anything before saving
3. Discard these changes and try a different approach

Please let me know your preference to proceed.
`
}

export function generateCodeReviewPrompt(code: string, path: string): string {
  return `
I'm reviewing the code for ${path}:

${code}

Here's my analysis:
1. Code structure and organization
2. Best practices adherence
3. Potential improvements
4. Performance considerations
5. Security implications

Would you like me to:
1. Implement suggested improvements
2. Explain any specific part in detail
3. Show how this integrates with other components
4. Provide a live preview of the changes

Please let me know how you'd like to proceed.
`
}
