import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

interface SetupOptions {
  projectId: string // Required for database operations and logging
  projectName: string
  projectPath: string
  repoUrl: string
  techStack: string[]
}

export async function setupProject(options: SetupOptions) {
  const { projectName, projectPath, repoUrl, techStack, projectId: _ } = options

  try {
    // Create project directory
    await fs.mkdir(projectPath, { recursive: true })

    // Change to project directory
    process.chdir(projectPath)

    // Initialize git repository
    await execAsync('git init')

    // Clone repository
    await execAsync(`git clone ${repoUrl} temp`)

    // Move repository contents
    const tempPath = path.join(projectPath, 'temp')
    const files = await fs.readdir(tempPath)
    
    for (const file of files) {
      if (file !== '.git') {
        await fs.rename(
          path.join(tempPath, file),
          path.join(projectPath, file)
        )
      }
    }

    // Remove temp directory
    await fs.rm(tempPath, { recursive: true, force: true })

    // Initialize project based on tech stack
    if (techStack.includes('next.js')) {
      await execAsync('npx create-next-app . --typescript --tailwind --eslint')
    } else if (techStack.includes('react')) {
      await execAsync('npx create-react-app . --template typescript')
    } else if (techStack.includes('expo')) {
      await execAsync('npx create-expo-app . --template')
    }

    // Install common dependencies
    await execAsync('npm install @headlessui/react @radix-ui/react-* framer-motion socket.io-client')

    // Create project structure
    const directories = [
      'src/components/ui',
      'src/components/chat',
      'src/components/analysis',
      'src/components/customization',
      'src/components/deployment',
      'src/lib/ai',
      'src/lib/db',
      'src/lib/github',
      'src/lib/chat',
      'src/lib/utils'
    ]

    for (const dir of directories) {
      await fs.mkdir(path.join(projectPath, dir), { recursive: true })
    }

    // Create README.md
    const readme = `# ${projectName}

## Project Overview
This project was set up using GRIP (GitHub Repo-Analysis Intellectual Partner).

## Getting Started
1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Project Structure
\`\`\`
src/
  ├── components/
  │   ├── ui/
  │   ├── chat/
  │   ├── analysis/
  │   ├── customization/
  │   └── deployment/
  └── lib/
      ├── ai/
      ├── db/
      ├── github/
      ├── chat/
      └── utils/
\`\`\`
`

    await fs.writeFile(path.join(projectPath, 'README.md'), readme)

    return {
      success: true,
      message: 'Project setup completed successfully'
    }
  } catch (error: any) {
    console.error('Error setting up project:', error)
    return {
      success: false,
      message: error?.message || 'An unknown error occurred'
    }
  }
} 