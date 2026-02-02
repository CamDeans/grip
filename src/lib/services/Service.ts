export enum SetupStage {
  INIT = 'init',
  STRUCTURE = 'structure',
  DEPENDENCIES = 'dependencies',
  INTEGRATIONS = 'integrations',
  VALIDATION = 'validation',
  COMPLETE = 'complete'
}

export interface ProjectInfo {
  id: string
  name: string
  formattedName: string
  path: string
  exists: boolean
  stage: SetupStage
  integrations?: {
    mongodb?: boolean
    websocket?: boolean
  }
}

export class Service {
  private terminal: HTMLDivElement | null = null

  async initialize(container: HTMLDivElement) {
    this.terminal = container
    // Initialize terminal
    this.writeInfo('Initializing terminal...')
  }

  async checkProjectDirectory(projectId: string, basePath: string): Promise<ProjectInfo> {
    // Check if project directory exists
    const formattedName = projectId.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const projectPath = `${basePath}/${formattedName}`

    // TODO: Implement actual directory check
    return {
      id: projectId,
      name: projectId,
      formattedName,
      path: projectPath,
      exists: false,
      stage: SetupStage.INIT
    }
  }

  async executeCommand(command: string): Promise<boolean> {
    try {
      this.writeInfo(`Executing: ${command}`)
      // TODO: Implement actual command execution
      return true
    } catch (error) {
      this.writeError(`Failed to execute command: ${command}`)
      return false
    }
  }

  writeInfo(message: string) {
    if (!this.terminal) return
    console.log(`[INFO] ${message}`)
    // TODO: Write to terminal
  }

  writeError(message: string) {
    if (!this.terminal) return
    console.error(`[ERROR] ${message}`)
    // TODO: Write to terminal
  }

  dispose() {
    this.terminal = null
  }
} 