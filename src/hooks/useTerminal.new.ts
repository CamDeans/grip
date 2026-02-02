import { useEffect, useRef, useState } from 'react'
import { Service, ProjectInfo, SetupStage } from '@/lib/services/Service'

interface State {
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  currentStage: SetupStage
  projectInfo: ProjectInfo | null
}

export function useTerminalInternalNew(projectId: string, basePath: string) {
  const Ref = useRef<Service | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  
  const [state, setState] = useState<State>({
    isInitialized: false,
    isLoading: true,
    error: null,
    currentStage: SetupStage.INIT,
    projectInfo: null
  })

  const initialize = async () => {
    if (!containerRef.current || state.isInitialized) return

    try {
      setState(prev => ({ ...prev, isLoading: true }))

      // Create and initialize  service
      Ref.current = new Service()
      await Ref.current.initialize(containerRef.current)

      // Check project directory
      const projectInfo = await Ref.current.checkProjectDirectory(projectId, basePath)
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        projectInfo,
        currentStage: projectInfo.exists ? SetupStage.DEPENDENCIES : SetupStage.STRUCTURE
      }))

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }))
    }
  }

  const setupProjectStructure = async () => {
    if (!Ref.current || !state.projectInfo) return false
    
    try {
      Ref.current.writeInfo('Setting up project structure...')
      
      // Create project directory
      const createDir = await Ref.current.executeCommand(
        `mkdir "${state.projectInfo.formattedName}"`
      )
      if (!createDir) return false

      // Initialize git
      const initGit = await Ref.current.executeCommand(
        `cd "${state.projectInfo.formattedName}" && git init`
      )
      if (!initGit) return false

      // Create basic structure
      const createStructure = await Ref.current.executeCommand(
        'mkdir src config tests docs'
      )
      if (!createStructure) return false

      setState(prev => ({ 
        ...prev, 
        currentStage: SetupStage.DEPENDENCIES,
        projectInfo: prev.projectInfo ? { 
          ...prev.projectInfo, 
          exists: true,
          stage: SetupStage.DEPENDENCIES
        } : null
      }))

      return true
    } catch (error: any) {
      Ref.current.writeError(error.message)
      return false
    }
  }

  const setupDependencies = async () => {
    if (!Ref.current || !state.projectInfo) return false
    
    try {
      Ref.current.writeInfo('Setting up project dependencies...')
      
      // Initialize package.json
      const initNpm = await Ref.current.executeCommand('npm init -y')
      if (!initNpm) return false

      // Install core dependencies
      const installDeps = await Ref.current.executeCommand(
        'npm install typescript @types/node ts-node nodemon --save-dev'
      )
      if (!installDeps) return false

      setState(prev => ({ 
        ...prev, 
        currentStage: SetupStage.INTEGRATIONS,
        projectInfo: prev.projectInfo ? {
          ...prev.projectInfo,
          stage: SetupStage.INTEGRATIONS
        } : null
      }))

      return true
    } catch (error: any) {
      Ref.current.writeError(error.message)
      return false
    }
  }

  const setupIntegrations = async () => {
    if (!Ref.current || !state.projectInfo) return false
    
    try {
      Ref.current.writeInfo('Setting up integrations...')
      
      // Install integration dependencies
      const installIntegrations = await Ref.current.executeCommand(
        'npm install mongodb socket.io dotenv'
      )
      if (!installIntegrations) return false

      setState(prev => ({ 
        ...prev, 
        currentStage: SetupStage.VALIDATION,
        projectInfo: prev.projectInfo ? {
          ...prev.projectInfo,
          stage: SetupStage.VALIDATION,
          integrations: {
            mongodb: true,
            websocket: true
          }
        } : null
      }))

      return true
    } catch (error: any) {
      Ref.current.writeError(error.message)
      return false
    }
  }

  const validateSetup = async () => {
    if (!Ref.current || !state.projectInfo) return false
    
    try {
      Ref.current.writeInfo('Validating project setup...')
      
      // Run validation commands
      const validateDeps = await Ref.current.executeCommand('npm list --depth=0')
      if (!validateDeps) return false

      setState(prev => ({ 
        ...prev, 
        currentStage: SetupStage.COMPLETE,
        projectInfo: prev.projectInfo ? {
          ...prev.projectInfo,
          stage: SetupStage.COMPLETE
        } : null
      }))

      return true
    } catch (error: any) {
      Ref.current.writeError(error.message)
      return false
    }
  }

  useEffect(() => {
    initialize()
    
    return () => {
      if (Ref.current) {
        Ref.current.dispose()
      }
    }
  }, [projectId, basePath])

  return {
    containerRef,
    state,
    actions: {
      setupProjectStructure,
      setupDependencies,
      setupIntegrations,
      validateSetup
    }
  }
} 
