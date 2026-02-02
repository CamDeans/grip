/**
 * Models index file
 * This exports all models and handles server/client environment detection
 */

import { isClient } from '@/lib/utils';

// Import server models (only used in server context)
import { ProjectStructure as ServerProjectStructure } from './ProjectStructure';
import { ProjectFile as ServerProjectFile } from './ProjectFile';
import { BuildLog as ServerBuildLog } from './BuildLog';
import { Task as ServerTask } from './Task';
import { TerminalSession as ServerTerminalSession } from './TerminalSession';
import { SystemState as ServerSystemState } from './SystemState';

// Import client model data structures (used in both contexts)
import { 
  IProjectStructureData,
  createEmptyProjectStructure
} from './clientModels/ProjectStructure';

import {
  IBuildLogData,
  createEmptyBuildLog,
  BuildLogUtils
} from './clientModels/BuildLog';

// Client-side models (empty shells that don't use mongoose)
const ClientProjectStructure = {
  // Add methods that client might need, returning empty data
  findOne: async () => createEmptyProjectStructure(),
  find: async () => [],
  create: async () => createEmptyProjectStructure(),
};

const ClientBuildLog = {
  findOne: async () => createEmptyBuildLog(),
  find: async () => [],
  create: async () => createEmptyBuildLog(),
  aggregate: async () => [],
};

const ClientProjectFile = {
  findOne: async () => null,
  find: async () => [],
  create: async () => null,
};

const ClientTask = {
  findOne: async () => null,
  find: async () => [],
  create: async () => null,
};

const ClientTerminalSession = {
  findOne: async () => null,
  find: async () => [],
  create: async () => null,
};

const ClientSystemState = {
  findOne: async () => null,
  find: async () => [],
  create: async () => null,
};

// Export the appropriate models based on environment
export const ProjectStructure = isClient ? ClientProjectStructure : ServerProjectStructure;
export const ProjectFile = isClient ? ClientProjectFile : ServerProjectFile;
export const BuildLog = isClient ? ClientBuildLog : ServerBuildLog;
export const Task = isClient ? ClientTask : ServerTask;
export const TerminalSession = isClient ? ClientTerminalSession : ServerTerminalSession;
export const SystemState = isClient ? ClientSystemState : ServerSystemState;

// Always export the data interfaces for type safety
export type { IProjectStructureData, IBuildLogData };

// Export all models from a single entry point
export * from './Project';
export * from './ProjectState';
export * from './Terminal';
export * from './UserSettings';
export * from './Notification';

// Phase 1 G.R.I.P. AI Assistant Enhancement Plan models
export * from './ProjectStructure';
export * from './ProjectFile';
export * from './BuildLog';
export * from './TerminalSession'; 

// Phase 5 G.R.I.P. AI Assistant Enhancement Plan models
export * from './Task';

// Phase 6 G.R.I.P. AI Assistant Enhancement Plan models - User Interaction Tracking
export * from './DevelopmentProgress';
export * from './PlanningResults';
export * from './DevelopmentSession';
export * from './TestingResults';

// Phase 7 G.R.I.P. AI Assistant Enhancement Plan models - Admin Controls
export * from './SystemState'; 