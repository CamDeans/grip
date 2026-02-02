import { clientPromise } from '@/lib/mongodb';
import { initializeProjectEnvironment } from '@/lib/project/init';
import { ObjectId } from 'mongodb';
import { Project, RepositoryAnalysis } from '@/types';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ProjectDetails {
  title: string;
  description: string;
  techStack: string[];
  features: string[];
  nextSteps: string[];
  dependencies: string[];
}

export async function POST(request: Request) {
  try {
    // Get projectId, documentsPath, and projectDetails from request body
    const { projectId, documentsPath, projectDetails } = await request.json();

    if (!projectId || !documentsPath || !projectDetails) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
      });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('test');

    // Get project and analysis data
    const projectDoc = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    const analysisDoc = await db.collection('analysis').findOne({ projectId: new ObjectId(projectId) });

    if (!projectDoc || !analysisDoc) {
      return new Response(JSON.stringify({ error: 'Project or analysis not found' }), {
        status: 404,
      });
    }

    // Transform MongoDB documents to match required types
    const project: Project = {
      id: projectDoc._id.toString(),
      title: projectDoc.title,
      description: projectDoc.description,
      ideation: projectDoc.ideation,
      createdAt: new Date(projectDoc.createdAt),
      updatedAt: new Date(projectDoc.updatedAt),
    };

    const analysis: RepositoryAnalysis = {
      projectId: analysisDoc.projectId.toString(),
      stages: analysisDoc.stages,
      repositoryStructure: analysisDoc.repositoryStructure,
      codeStructure: analysisDoc.codeStructure,
      recommendations: analysisDoc.recommendations,
      createdAt: new Date(analysisDoc.createdAt),
      updatedAt: new Date(analysisDoc.updatedAt),
    };

    // Initialize project environment with provided Documents path
    const result = await initializeProjectEnvironment({
      project,
      analysis,
      basePath: documentsPath,
      projectDetails
    });

    if (!result.success || !result.projectPath) {
      return new Response(JSON.stringify({ error: result.error || 'Failed to initialize project' }), {
        status: 500,
      });
    }

    // Create project configuration files
    await createProjectFiles(result.projectPath, projectDetails);

    // Update project with environment path
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          environmentPath: result.projectPath,
          status: 'initialized',
          updatedAt: new Date(),
        },
      }
    );

    return new Response(JSON.stringify({ 
      projectPath: result.projectPath,
      message: 'Project initialized successfully'
    }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error in project initialization:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to initialize project' }), {
      status: 500,
    });
  }
}

async function createProjectFiles(projectPath: string, projectDetails: ProjectDetails) {
  // Create package.json
  const packageJson = {
    name: projectDetails.title.toLowerCase().replace(/\s+/g, '-'),
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint',
      test: 'jest'
    },
    dependencies: {
      'next': '^14.0.0',
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      '@headlessui/react': '^1.7.0',
      '@radix-ui/react': '^1.0.0',
      'framer-motion': '^10.0.0',
      'tailwindcss': '^3.3.0',
      'socket.io-client': '^4.7.0',
      'mongodb': '^6.0.0'
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.2.0',
      'typescript': '^5.0.0',
      'jest': '^29.0.0',
      '@testing-library/react': '^14.0.0'
    }
  };

  await fs.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create README.md
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

  await fs.writeFile(path.join(projectPath, 'README.md'), readme);

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
    path.join(projectPath, 'tsconfig.json'),
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
    await fs.mkdir(path.join(projectPath, dir), { recursive: true });
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

  await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
} 