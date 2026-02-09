import { ObjectId } from 'mongodb'
import { Anthropic } from '@anthropic-ai/sdk'
import { connectToDatabase } from '@/lib/mongodb'
import { IProjectStructure } from '@/lib/models/ProjectStructure'
import { getProjectStructure } from '@/lib/services/planStorageService'
import { ITaskData } from '@/lib/models/Task'
import { createTask } from '@/lib/services/taskQueueService'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'

/**
 * Command Generator Service - Creates service to generate build commands from project plan
 * Part of Phase 5, Step 2 of the G.R.I.P. AI Assistant Enhancement Plan
 */

function getAnthropicClient() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

// Command types
export type CommandType = 'install' | 'build' | 'test' | 'lint' | 'deploy' | 'custom';

// Command generator request
export interface CommandGenerationRequest {
  projectId: string;
  commandType: CommandType;
  context?: {
    specificTasks?: string[];
    environmentVariables?: Record<string, string>;
    customParameters?: Record<string, string>;
  };
}

// Generated command
export interface GeneratedCommand {
  commandId: string;
  projectId: string;
  type: CommandType;
  command: string;
  args: string[];
  description: string;
  estimatedDuration: number; // in seconds
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  dependencies?: string[]; // IDs of commands that must run before this one
}

// Batch command generation request
export interface BatchCommandGenerationRequest {
  projectId: string;
  buildSequence: CommandType[];
  context?: {
    environmentVariables?: Record<string, string>;
    customParameters?: Record<string, string>;
  };
}

// Package manager detection result
export interface PackageManagerInfo {
  name: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'cargo' | 'go' | 'maven' | 'gradle' | 'unknown';
  version?: string;
  hasLockFile: boolean;
  installCommand: string;
  buildCommand: string;
  testCommand: string;
  lintCommand: string;
}

/**
 * Detect package manager from project structure
 * @param projectStructure Project structure data
 * @returns Package manager info
 */
function detectPackageManager(projectStructure: IProjectStructure): PackageManagerInfo {
  // Default to npm if no package manager detected
  const defaultPackageManager: PackageManagerInfo = {
    name: 'npm',
    hasLockFile: false,
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    testCommand: 'npm test',
    lintCommand: 'npm run lint'
  };

  // Check root level files for package manager files
  const rootFiles = getFilesInDirectory(projectStructure.fileHierarchy, '/');
  
  // Check for JavaScript/TypeScript package managers
  if (rootFiles.includes('package.json')) {
    if (rootFiles.includes('yarn.lock')) {
      return {
        name: 'yarn',
        hasLockFile: true,
        installCommand: 'yarn install',
        buildCommand: 'yarn build',
        testCommand: 'yarn test',
        lintCommand: 'yarn lint'
      };
    } else if (rootFiles.includes('pnpm-lock.yaml')) {
      return {
        name: 'pnpm',
        hasLockFile: true,
        installCommand: 'pnpm install',
        buildCommand: 'pnpm run build',
        testCommand: 'pnpm test',
        lintCommand: 'pnpm run lint'
      };
    } else {
      return {
        name: 'npm',
        hasLockFile: rootFiles.includes('package-lock.json'),
        installCommand: 'npm install',
        buildCommand: 'npm run build',
        testCommand: 'npm test',
        lintCommand: 'npm run lint'
      };
    }
  }
  
  // Check for Python package managers
  if (rootFiles.includes('requirements.txt') || rootFiles.includes('setup.py')) {
    return {
      name: 'pip',
      hasLockFile: false,
      installCommand: 'pip install -r requirements.txt',
      buildCommand: 'python setup.py build',
      testCommand: 'pytest',
      lintCommand: 'flake8'
    };
  } else if (rootFiles.includes('pyproject.toml')) {
    if (rootFiles.includes('poetry.lock')) {
      return {
        name: 'poetry',
        hasLockFile: true,
        installCommand: 'poetry install',
        buildCommand: 'poetry build',
        testCommand: 'poetry run pytest',
        lintCommand: 'poetry run flake8'
      };
    }
  }
  
  // Check for Rust package manager
  if (rootFiles.includes('Cargo.toml')) {
    return {
      name: 'cargo',
      hasLockFile: rootFiles.includes('Cargo.lock'),
      installCommand: 'cargo fetch',
      buildCommand: 'cargo build',
      testCommand: 'cargo test',
      lintCommand: 'cargo clippy'
    };
  }
  
  // Check for Go modules
  if (rootFiles.includes('go.mod')) {
    return {
      name: 'go',
      hasLockFile: rootFiles.includes('go.sum'),
      installCommand: 'go mod download',
      buildCommand: 'go build',
      testCommand: 'go test ./...',
      lintCommand: 'golint ./...'
    };
  }
  
  // Check for Java/Kotlin package managers
  if (rootFiles.includes('pom.xml')) {
    return {
      name: 'maven',
      hasLockFile: false,
      installCommand: 'mvn dependency:resolve',
      buildCommand: 'mvn package',
      testCommand: 'mvn test',
      lintCommand: 'mvn checkstyle:check'
    };
  } else if (rootFiles.includes('build.gradle') || rootFiles.includes('build.gradle.kts')) {
    return {
      name: 'gradle',
      hasLockFile: false,
      installCommand: 'gradle dependencies',
      buildCommand: 'gradle build',
      testCommand: 'gradle test',
      lintCommand: 'gradle lint'
    };
  }
  
  return defaultPackageManager;
}

/**
 * Get list of files in a directory
 * @param fileHierarchy File hierarchy node
 * @param path Path to directory
 * @returns Array of filenames
 */
function getFilesInDirectory(fileHierarchy: any, path: string): string[] {
  if (fileHierarchy.path !== path) {
    // If this is not the directory we're looking for and it's a file, return empty array
    if (fileHierarchy.type === 'file') {
      return [];
    }
    
    // Look in children
    if (fileHierarchy.children) {
      for (const child of fileHierarchy.children) {
        if (child.path === path || child.path.startsWith(path + '/')) {
          return getFilesInDirectory(child, path);
        }
      }
    }
    
    return [];
  }
  
  // This is the directory we're looking for
  const files: string[] = [];
  
  if (fileHierarchy.children) {
    for (const child of fileHierarchy.children) {
      if (child.type === 'file') {
        files.push(child.name);
      }
    }
  }
  
  return files;
}

/**
 * Get build scripts from package.json
 * @param projectStructure Project structure
 * @returns Object with script commands
 */
async function getPackageJsonScripts(projectStructure: IProjectStructure): Promise<Record<string, string>> {
  try {
    // Find package.json in the project structure
    let packageJsonContent = '';
    
    function findPackageJson(node: any): boolean {
      if (node.type === 'file' && node.name === 'package.json') {
        try {
          // In a real implementation, this would fetch the file content from the database
          // For now, we'll return an empty object if we can't parse it
          packageJsonContent = node.content || '';
          return true;
        } catch (error) {
          console.error('Error parsing package.json:', error);
          return false;
        }
      }
      
      if (node.children) {
        for (const child of node.children) {
          if (findPackageJson(child)) {
            return true;
          }
        }
      }
      
      return false;
    }
    
    findPackageJson(projectStructure.fileHierarchy);
    
    if (!packageJsonContent) {
      return {};
    }
    
    // Parse package.json
    try {
      const packageJson = JSON.parse(packageJsonContent);
      return packageJson.scripts || {};
    } catch (error) {
      console.error('Error parsing package.json content:', error);
      return {};
    }
  } catch (error) {
    console.error('Error getting package.json scripts:', error);
    return {};
  }
}

/**
 * Generate installation command
 * @param packageManager Package manager info
 * @param context Additional context
 * @returns Generated command
 */
function generateInstallCommand(
  packageManager: PackageManagerInfo,
  context?: CommandGenerationRequest['context']
): GeneratedCommand {
  const commandId = `install-${Date.now()}`;
  
  // Start with the basic install command
  let command = packageManager.installCommand;
  let args: string[] = [];
  
  // Split command and arguments
  const commandParts = command.split(' ');
  command = commandParts[0];
  args = commandParts.slice(1);
  
  // Add any custom environment variables
  const environmentVariables: Record<string, string> = {
    ...(context?.environmentVariables || {})
  };
  
  // For npm/yarn, we might want to add cache settings
  if (packageManager.name === 'npm' || packageManager.name === 'yarn' || packageManager.name === 'pnpm') {
    // Optionally add --no-save for temporary installs
    if (context?.customParameters?.noSave === 'true') {
      args.push('--no-save');
    }
    
    // Optionally add --production flag
    if (context?.customParameters?.production === 'true') {
      args.push('--production');
    }
  }
  
  return {
    commandId,
    projectId: '', // This will be filled in by the caller
    type: 'install',
    command,
    args,
    description: `Install dependencies using ${packageManager.name}`,
    estimatedDuration: 120, // Estimated 2 minutes for installation
    environmentVariables
  };
}

/**
 * Generate build command
 * @param packageManager Package manager info
 * @param scripts Available scripts from package.json
 * @param context Additional context
 * @returns Generated command
 */
function generateBuildCommand(
  packageManager: PackageManagerInfo,
  scripts: Record<string, string>,
  context?: CommandGenerationRequest['context']
): GeneratedCommand {
  const commandId = `build-${Date.now()}`;
  
  // Start with the basic build command
  let command = packageManager.buildCommand;
  let args: string[] = [];
  
  // Check if there's a custom build script in package.json
  if (packageManager.name === 'npm' || packageManager.name === 'yarn' || packageManager.name === 'pnpm') {
    // Check for common build script names
    const buildScriptNames = ['build', 'compile', 'package', 'production'];
    let foundBuildScript = false;
    
    for (const scriptName of buildScriptNames) {
      if (scripts[scriptName]) {
        // Use the package manager to run the script
        command = packageManager.name;
        if (packageManager.name === 'npm') {
          args = ['run', scriptName];
        } else if (packageManager.name === 'yarn') {
          args = [scriptName];
        } else if (packageManager.name === 'pnpm') {
          args = ['run', scriptName];
        }
        foundBuildScript = true;
        break;
      }
    }
    
    // If no build script found, fall back to default
    if (!foundBuildScript) {
      const commandParts = command.split(' ');
      command = commandParts[0];
      args = commandParts.slice(1);
    }
  } else {
    // For other package managers, use the default build command
    const commandParts = command.split(' ');
    command = commandParts[0];
    args = commandParts.slice(1);
  }
  
  // Add any custom environment variables
  const environmentVariables: Record<string, string> = {
    NODE_ENV: 'production', // Typically want production mode for builds
    ...(context?.environmentVariables || {})
  };
  
  // Add any custom arguments
  if (context?.customParameters?.buildArgs) {
    args = [...args, ...context.customParameters.buildArgs.split(' ')];
  }
  
  return {
    commandId,
    projectId: '', // This will be filled in by the caller
    type: 'build',
    command,
    args,
    description: `Build the project using ${command} ${args.join(' ')}`,
    estimatedDuration: 60, // Estimated 1 minute for build
    environmentVariables
  };
}

/**
 * Generate test command
 * @param packageManager Package manager info
 * @param scripts Available scripts from package.json
 * @param context Additional context
 * @returns Generated command
 */
function generateTestCommand(
  packageManager: PackageManagerInfo,
  scripts: Record<string, string>,
  context?: CommandGenerationRequest['context']
): GeneratedCommand {
  const commandId = `test-${Date.now()}`;
  
  // Start with the basic test command
  let command = packageManager.testCommand;
  let args: string[] = [];
  
  // Check if there's a custom test script in package.json
  if (packageManager.name === 'npm' || packageManager.name === 'yarn' || packageManager.name === 'pnpm') {
    // Check for common test script names
    const testScriptNames = ['test', 'tests', 'unit', 'unittest', 'unit-test'];
    let foundTestScript = false;
    
    for (const scriptName of testScriptNames) {
      if (scripts[scriptName]) {
        // Use the package manager to run the script
        command = packageManager.name;
        if (packageManager.name === 'npm') {
          args = ['run', scriptName];
        } else if (packageManager.name === 'yarn') {
          args = [scriptName];
        } else if (packageManager.name === 'pnpm') {
          args = ['run', scriptName];
        }
        foundTestScript = true;
        break;
      }
    }
    
    // If no test script found, fall back to default
    if (!foundTestScript) {
      const commandParts = command.split(' ');
      command = commandParts[0];
      args = commandParts.slice(1);
    }
  } else {
    // For other package managers, use the default test command
    const commandParts = command.split(' ');
    command = commandParts[0];
    args = commandParts.slice(1);
  }
  
  // Add any custom environment variables
  const environmentVariables: Record<string, string> = {
    NODE_ENV: 'test', // Typically want test mode for tests
    ...(context?.environmentVariables || {})
  };
  
  // Add any custom arguments
  if (context?.customParameters?.testArgs) {
    args = [...args, ...context.customParameters.testArgs.split(' ')];
  }
  
  return {
    commandId,
    projectId: '', // This will be filled in by the caller
    type: 'test',
    command,
    args,
    description: `Run tests using ${command} ${args.join(' ')}`,
    estimatedDuration: 30, // Estimated 30 seconds for tests
    environmentVariables
  };
}

/**
 * Generate lint command
 * @param packageManager Package manager info
 * @param scripts Available scripts from package.json
 * @param context Additional context
 * @returns Generated command
 */
function generateLintCommand(
  packageManager: PackageManagerInfo,
  scripts: Record<string, string>,
  context?: CommandGenerationRequest['context']
): GeneratedCommand {
  const commandId = `lint-${Date.now()}`;
  
  // Start with the basic lint command
  let command = packageManager.lintCommand;
  let args: string[] = [];
  
  // Check if there's a custom lint script in package.json
  if (packageManager.name === 'npm' || packageManager.name === 'yarn' || packageManager.name === 'pnpm') {
    // Check for common lint script names
    const lintScriptNames = ['lint', 'eslint', 'tslint', 'prettier'];
    let foundLintScript = false;
    
    for (const scriptName of lintScriptNames) {
      if (scripts[scriptName]) {
        // Use the package manager to run the script
        command = packageManager.name;
        if (packageManager.name === 'npm') {
          args = ['run', scriptName];
        } else if (packageManager.name === 'yarn') {
          args = [scriptName];
        } else if (packageManager.name === 'pnpm') {
          args = ['run', scriptName];
        }
        foundLintScript = true;
        break;
      }
    }
    
    // If no lint script found, fall back to default (or skip if no default)
    if (!foundLintScript) {
      const commandParts = command.split(' ');
      command = commandParts[0];
      args = commandParts.slice(1);
    }
  } else {
    // For other package managers, use the default lint command
    const commandParts = command.split(' ');
    command = commandParts[0];
    args = commandParts.slice(1);
  }
  
  // Add any custom environment variables
  const environmentVariables: Record<string, string> = {
    ...(context?.environmentVariables || {})
  };
  
  // Add any custom arguments
  if (context?.customParameters?.lintArgs) {
    args = [...args, ...context.customParameters.lintArgs.split(' ')];
  }
  
  return {
    commandId,
    projectId: '', // This will be filled in by the caller
    type: 'lint',
    command,
    args,
    description: `Lint code using ${command} ${args.join(' ')}`,
    estimatedDuration: 20, // Estimated 20 seconds for linting
    environmentVariables
  };
}

/**
 * Generate a custom command using AI based on context
 * @param projectId Project ID
 * @param context Command context
 * @returns Generated command
 */
async function generateCustomCommand(
  projectId: string,
  context: CommandGenerationRequest['context']
): Promise<GeneratedCommand> {
  const commandId = `custom-${Date.now()}`;
  
  if (!context || !context.customParameters || !context.customParameters.customCommandPrompt) {
    return {
      commandId,
      projectId,
      type: 'custom',
      command: 'echo',
      args: ['No custom command specified'],
      description: 'No custom command specified',
      estimatedDuration: 1
    };
  }
  
  try {
    // Get the project structure
    const projectStructure = await getProjectStructure(projectId);
    if (!projectStructure) {
      throw new Error(`Project structure not found for project: ${projectId}`);
    }
    
    // Detect the package manager
    const packageManager = detectPackageManager(projectStructure);
    
    // Get scripts from package.json if available
    const scripts = await getPackageJsonScripts(projectStructure);
    
    // Build a prompt for Claude to generate a custom command
    const prompt = `You are an AI assistant helping to generate a build command for a software project based on the following details:

Project Type: ${packageManager.name} project
Available Scripts: ${JSON.stringify(scripts, null, 2)}
Custom Command Request: ${context.customParameters.customCommandPrompt}

Please generate a command that would achieve the requested task. Return your answer in the following JSON format:
\`\`\`json
{
  "command": "the_main_command",
  "args": ["arg1", "arg2", ...],
  "description": "Brief description of what this command does",
  "estimatedDuration": 30
}
\`\`\`

Only respond with the JSON, nothing else.`;
    
    // Call Claude to generate the command
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 1000,
      system: "You are a helpful AI assistant who is an expert in build systems, package managers, and command line tools for software development.",
      messages: [
        { 
          role: "user", 
          content: prompt 
        }
      ],
    });
    
    // Parse the response
    const responseText = response.content[0].text;
    const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                      responseText.match(/```\n([\s\S]*)\n```/) ||
                      [null, responseText];
    
    const jsonContent = jsonMatch ? jsonMatch[1] : responseText;
    
    try {
      const parsedCommand = JSON.parse(jsonContent);
      
      return {
        commandId,
        projectId,
        type: 'custom',
        command: parsedCommand.command,
        args: parsedCommand.args || [],
        description: parsedCommand.description || 'Custom command',
        estimatedDuration: parsedCommand.estimatedDuration || 30
      };
    } catch (parseError) {
      console.error('Error parsing AI-generated command:', parseError);
      // Fall back to a simple echo command
      return {
        commandId,
        projectId,
        type: 'custom',
        command: 'echo',
        args: ['Failed to generate custom command'],
        description: 'Failed to generate custom command',
        estimatedDuration: 1
      };
    }
  } catch (error) {
    console.error('Error generating custom command:', error);
    return {
      commandId,
      projectId,
      type: 'custom',
      command: 'echo',
      args: ['Error generating custom command'],
      description: 'Error occurred while generating custom command',
      estimatedDuration: 1
    };
  }
}

/**
 * Generate a single command for a project
 * @param request Command generation request
 * @returns Generated command
 */
export async function generateCommand(request: CommandGenerationRequest): Promise<GeneratedCommand> {
  try {
    console.log(`Generating ${request.commandType} command for project ${request.projectId}`);
    
    // Get the project structure
    const projectStructure = await getProjectStructure(request.projectId);
    if (!projectStructure) {
      throw new Error(`Project structure not found for project: ${request.projectId}`);
    }
    
    // Detect the package manager
    const packageManager = detectPackageManager(projectStructure);
    
    // Get scripts from package.json if available
    const scripts = await getPackageJsonScripts(projectStructure);
    
    let generatedCommand: GeneratedCommand;
    
    // Generate command based on type
    switch (request.commandType) {
      case 'install':
        generatedCommand = generateInstallCommand(packageManager, request.context);
        break;
      case 'build':
        generatedCommand = generateBuildCommand(packageManager, scripts, request.context);
        break;
      case 'test':
        generatedCommand = generateTestCommand(packageManager, scripts, request.context);
        break;
      case 'lint':
        generatedCommand = generateLintCommand(packageManager, scripts, request.context);
        break;
      case 'custom':
        generatedCommand = await generateCustomCommand(request.projectId, request.context);
        break;
      default:
        throw new Error(`Unsupported command type: ${request.commandType}`);
    }
    
    // Add the project ID
    generatedCommand.projectId = request.projectId;
    
    return generatedCommand;
  } catch (error) {
    console.error(`Error generating ${request.commandType} command:`, error);
    throw error;
  }
}

/**
 * Generate a batch of commands for a build sequence
 * @param request Batch command generation request
 * @returns Array of generated commands with dependencies
 */
export async function generateBuildSequence(request: BatchCommandGenerationRequest): Promise<GeneratedCommand[]> {
  try {
    console.log(`Generating build sequence for project ${request.projectId}`);
    
    const commands: GeneratedCommand[] = [];
    let previousCommandId: string | undefined;
    
    // Generate each command in the sequence
    for (const commandType of request.buildSequence) {
      const commandRequest: CommandGenerationRequest = {
        projectId: request.projectId,
        commandType,
        context: request.context
      };
      
      const command = await generateCommand(commandRequest);
      
      // Add dependency on previous command if there is one
      if (previousCommandId) {
        command.dependencies = command.dependencies || [];
        command.dependencies.push(previousCommandId);
      }
      
      commands.push(command);
      previousCommandId = command.commandId;
    }
    
    return commands;
  } catch (error) {
    console.error('Error generating build sequence:', error);
    throw error;
  }
}

/**
 * Create tasks from generated commands
 * @param commands Generated commands
 * @param context Additional context
 * @returns Array of created task IDs
 */
export async function createTasksFromCommands(
  commands: GeneratedCommand[],
  context?: {
    priority?: 'low' | 'normal' | 'high' | 'critical';
    scheduledFor?: Date;
    createdBy: string;
  }
): Promise<string[]> {
  try {
    console.log(`Creating ${commands.length} tasks from commands`);
    
    const taskIds: string[] = [];
    const commandIdToTaskId = new Map<string, string>();
    
    // Create tasks for each command
    for (const command of commands) {
      // Map command dependencies to task dependencies
      const dependencies: string[] = [];
      if (command.dependencies && command.dependencies.length > 0) {
        for (const dependencyCommandId of command.dependencies) {
          const dependencyTaskId = commandIdToTaskId.get(dependencyCommandId);
          if (dependencyTaskId) {
            dependencies.push(dependencyTaskId);
          }
        }
      }
      
      // Create the task
      const task = await createTask({
        projectId: command.projectId,
        name: `${command.type} - ${command.description}`,
        description: command.description,
        type: command.type === 'custom' ? 'build' : command.type,
        priority: context?.priority || 'normal',
        command: command.command,
        args: command.args,
        workingDirectory: command.workingDirectory,
        scheduledFor: context?.scheduledFor,
        dependencies,
        metadata: {
          createdBy: context?.createdBy || 'system',
          environment: command.environmentVariables
        }
      });
      
      if (task) {
        taskIds.push(task._id.toString());
        commandIdToTaskId.set(command.commandId, task._id.toString());
      }
    }
    
    return taskIds;
  } catch (error) {
    console.error('Error creating tasks from commands:', error);
    throw error;
  }
}

/**
 * Generate a full build pipeline for a project
 * @param projectId Project ID
 * @param createdBy User ID or name who created the pipeline
 * @returns Array of created task IDs
 */
export async function generateBuildPipeline(
  projectId: string,
  createdBy: string
): Promise<string[]> {
  try {
    console.log(`Generating build pipeline for project ${projectId}`);
    
    // Standard build sequence
    const buildSequence: CommandType[] = ['install', 'lint', 'test', 'build'];
    
    // Generate commands for the build sequence
    const commands = await generateBuildSequence({
      projectId,
      buildSequence,
      context: {
        environmentVariables: {
          CI: 'true',
          NODE_ENV: 'production'
        }
      }
    });
    
    // Create tasks from the commands
    const taskIds = await createTasksFromCommands(commands, {
      priority: 'normal',
      createdBy
    });
    
    return taskIds;
  } catch (error) {
    console.error('Error generating build pipeline:', error);
    throw error;
  }
} 