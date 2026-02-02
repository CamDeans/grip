/**
 * Service index file
 * Export all services from here for better imports
 */

// Export all services from a single entry point

// Existing services exports
export * as AIService from './aiService';
export * as AnalysisService from './analysisService';
export * as ChatService from './chatService';
export * as ChatHistoryService from './chatHistoryService';
export * as DockerService from './dockerService';
export * as ProjectService from './projectService';
export * as ProjectStateService from './projectStateService';
export * as ProjectSteps from './projectSteps';
export * as SettingsService from './settingsService';
export * as TerminalService from './terminalService';

// Phase 1 G.R.I.P. AI Assistant Enhancement Plan services
export { ProjectAutomationService } from './projectAutomationService';

// Phase 3 G.R.I.P. AI Assistant Enhancement Plan services
export * from './projectAnalyzerService';
export * from './structureGeneratorService';
export * from './planGeneratorService';
export * from './dependencyResolverService';
export * from './planStorageService';

// Phase 4 G.R.I.P. AI Assistant Enhancement Plan services
export * from './templateEngineService';
export * from './fileGeneratorService';
export * from './languageSupportService';
export * from './fileStorageService';
export * from './versionControlService';

// Phase 5 G.R.I.P. AI Assistant Enhancement Plan services
export * as TaskQueueService from './taskQueueService';
export * from './commandGeneratorService';
export * from './taskRunnerService';
export * from './loggingService';
export * from './errorRecoveryService'; 