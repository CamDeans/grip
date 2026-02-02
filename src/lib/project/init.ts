import * as fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Project, RepositoryAnalysis } from '@/types';

interface ProjectDetails {
  title: string;
  description: string;
  techStack: string[];
  features: string[];
  nextSteps: string[];
  dependencies: string[];
}

interface ProjectInitOptions {
  project: Project;
  analysis?: RepositoryAnalysis;
  basePath?: string;
  projectDetails?: ProjectDetails;
}

// Helper function to sanitize project name for directory name
function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace invalid chars with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Helper function to get user's Documents directory
function getUserDocumentsPath(): string {
  const homeDir = os.homedir();
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      return path.join(homeDir, 'Documents');
    case 'darwin': // macOS
      return path.join(homeDir, 'Documents');
    case 'linux':
      // On Linux, check XDG_DOCUMENTS_DIR first, fallback to ~/Documents
      const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
      const userDirsPath = path.join(xdgConfigHome, 'user-dirs.dirs');
      
      try {
        if (existsSync(userDirsPath)) {
          const content = readFileSync(userDirsPath, 'utf8');
          const match = content.match(/XDG_DOCUMENTS_DIR="(.+)"/);
          if (match && match[1]) {
            return match[1].replace('$HOME', homeDir);
          }
        }
      } catch (error) {
        console.warn('Could not read XDG user dirs config:', error);
      }
      return path.join(homeDir, 'Documents');
    default:
      return path.join(homeDir, 'Documents');
  }
}

export async function initializeProjectEnvironment({ 
  project, 
  basePath, 
  projectDetails,
  // analysis parameter reserved for future repository-based initialization
  analysis: _ 
}: ProjectInitOptions) {
  try {
    // Get the user's Documents directory if basePath is not provided
    const documentsPath = basePath || getUserDocumentsPath();
    
    // Create project directory using project title (sanitized)
    const projectName = sanitizeProjectName(project.title);
    const projectDir = path.join(documentsPath, projectName);

    // Check if directory already exists
    try {
      await fs.access(projectDir);
      return {
        success: false,
        error: `Project directory already exists at ${projectDir}`
      };
    } catch {
      // Directory doesn't exist, proceed with creation
    }

    // Create empty project directory
    await fs.mkdir(projectDir, { recursive: true });

    // Create project files if projectDetails is provided
    if (projectDetails) {
      await createConfigFiles(projectDir, project, projectDetails);
    }

    return {
      success: true,
      projectPath: projectDir,
      message: 'Project directory created successfully',
    };
  } catch (error) {
    console.error('Error creating project directory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

async function createConfigFiles(projectDir: string, project: Project, projectDetails: ProjectDetails) {
  // Create package.json
  const packageJson = {
    name: sanitizeProjectName(project.title),
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
      test: 'jest'
    },
    dependencies: Object.fromEntries(
      projectDetails.dependencies.map(dep => [dep, '^1.0.0'])
    ),
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.2.0',
      'typescript': '^5.0.0',
      'jest': '^29.0.0',
      '@testing-library/react': '^14.0.0'
    }
  };

  await fs.writeFile(
    path.join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create README.md with project details
  const readme = `# ${projectDetails.title}

${projectDetails.description}

## Features

${projectDetails.features.map(feature => `- ${feature}`).join('\n')}

## Tech Stack

${projectDetails.techStack.map(tech => `- ${tech}`).join('\n')}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

\`\`\`
src/
  ├── components/     # React components
  ├── lib/           # Utility functions and services
  ├── app/           # Next.js app router pages
  └── types/         # TypeScript type definitions
\`\`\`

## Next Steps

${projectDetails.nextSteps.map(step => `- ${step}`).join('\n')}
`;

  await fs.writeFile(path.join(projectDir, 'README.md'), readme);

  // Create tsconfig.json
  const tsConfig = {
    compilerOptions: {
      target: 'es5',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'node',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [
        {
          name: 'next'
        }
      ],
      paths: {
        '@/*': ['./src/*']
      }
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules']
  };

  await fs.writeFile(
    path.join(projectDir, 'tsconfig.json'),
    JSON.stringify(tsConfig, null, 2)
  );

  // Create basic project structure
  const directories = [
    'src/components',
    'src/lib',
    'src/app',
    'src/types',
    'src/styles',
    'src/utils',
    'src/hooks',
    'src/context',
    'src/services',
    'src/assets'
  ];

  for (const dir of directories) {
    await fs.mkdir(path.join(projectDir, dir), { recursive: true });
  }

  // Create .gitignore
  const gitignore = `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`;

  await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);
} 