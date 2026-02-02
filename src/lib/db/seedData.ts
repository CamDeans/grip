/**
 * Data Seeding Module
 * 
 * This module provides a structured way to populate essential data in the database
 * for both development and production environments.
 */

import { connectToDatabase } from '@/lib/mongodb';
import { BuildLog, ProjectFile, Task, ProjectStructure } from '@/lib/models';
import { ObjectId } from 'mongodb';

/**
 * Seed data for a specific collection
 * @param options Configuration options for seeding
 */
export async function seedCollection({
  collection,
  data,
  identifierField,
  environment = 'all',
  forceUpdate = false
}: {
  collection: 'buildLogs' | 'projectFiles' | 'tasks' | 'projectStructures';
  data: any[];
  identifierField: string;
  environment?: 'development' | 'production' | 'all';
  forceUpdate?: boolean;
}) {
  // Skip if environment doesn't match
  const currentEnv = process.env.NODE_ENV || 'development';
  if (environment !== 'all' && environment !== currentEnv) {
    console.log(`Skipping seed for ${collection} - environment ${currentEnv} doesn't match ${environment}`);
    return { created: 0, updated: 0, skipped: data.length };
  }

  // Connect to database
  await connectToDatabase();

  // Get the appropriate model based on collection name
  let model;
  switch (collection) {
    case 'buildLogs':
      model = BuildLog;
      break;
    case 'projectFiles':
      model = ProjectFile;
      break;
    case 'tasks':
      model = Task;
      break;
    case 'projectStructures':
      model = ProjectStructure;
      break;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }

  // Track counts for reporting
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Process each data item
  for (const item of data) {
    // Create query to find if the item exists
    const query = { [identifierField]: item[identifierField] };
    
    // Find existing item
    const existing = await (model as any).findOne(query);

    if (!existing) {
      // Create new item if it doesn't exist
      await (model as any).create(item);
      created++;
      console.log(`Created ${collection} item with ${identifierField}=${item[identifierField]}`);
    } else if (forceUpdate) {
      // Update existing item if forceUpdate is true
      await (model as any).findOneAndUpdate(query, { $set: item }, { new: true });
      updated++;
      console.log(`Updated ${collection} item with ${identifierField}=${item[identifierField]}`);
    } else {
      // Skip if item exists and forceUpdate is false
      skipped++;
    }
  }

  return { created, updated, skipped };
}

/**
 * Seed sample build logs
 * This is useful to ensure UI components have data to display
 */
export async function seedSampleBuildLogs(
  environment: 'development' | 'production' | 'all' = 'development',
  projectId?: string | ObjectId
) {
  const sampleProjectId = projectId || 'sample-project';
  
  // Convert projectId to string for comparison
  const projectIdStr = typeof sampleProjectId === 'object' 
    ? (sampleProjectId as ObjectId).toString() 
    : sampleProjectId;
  
  // Sample build logs
  const sampleLogs = [
    {
      projectId: projectIdStr,
      taskId: `build-sample-${projectIdStr}-1`,
      taskType: 'build',
      status: 'completed',
      command: 'npm run build',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() - 3500000),   // 58 minutes ago
      duration: 100000, // 100 seconds
      output: "Build completed successfully\n\nWebpack compiled successfully\nOutput files: 12\nBundle size: 2.3MB\nCompilation time: 12.4s",
      exitCode: 0,
      environment: {
        NODE_ENV: "production"
      },
      metadata: {
        triggeredBy: 'system',
        phase: 'deployment',
        step: 'build'
      },
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 3500000)
    },
    {
      projectId: projectIdStr,
      taskId: `test-sample-${projectIdStr}-1`,
      taskType: 'test',
      status: 'failed',
      command: 'npm run test',
      startTime: new Date(Date.now() - 7200000), // 2 hours ago
      endTime: new Date(Date.now() - 7150000),   // 1 hour 59 minutes ago
      duration: 50000, // 50 seconds
      output: "Tests failed: 2 of 10 tests failing\n\nFAILED TEST: Authentication flow\nError: Expected status code 200 but got 403\n\nFAILED TEST: User profile update\nError: Timeout waiting for database response",
      exitCode: 1,
      environment: {
        NODE_ENV: "test"
      },
      metadata: {
        triggeredBy: 'system',
        phase: 'testing',
        step: 'unit-tests'
      },
      createdAt: new Date(Date.now() - 7200000),
      updatedAt: new Date(Date.now() - 7150000)
    },
    {
      projectId: projectIdStr,
      taskId: `deploy-sample-${projectIdStr}-1`,
      taskType: 'deploy',
      status: 'running',
      command: 'npm run deploy',
      startTime: new Date(), // Now
      output: "Deploying to production...\n\nInitializing deployment\nBundling assets\nUploading to server\nConfiguration in progress...",
      environment: {
        NODE_ENV: "production"
      },
      metadata: {
        triggeredBy: 'system',
        phase: 'deployment',
        step: 'deploy'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  return seedCollection({
    collection: 'buildLogs',
    data: sampleLogs,
    identifierField: 'taskId',
    environment,
    forceUpdate: false // Don't overwrite existing logs
  });
}

/**
 * Seed sample project structure
 */
export async function seedSampleProjectStructure(
  environment: 'development' | 'production' | 'all' = 'development',
  projectId?: string | ObjectId
) {
  const sampleProjectId = projectId || 'sample-project';
  
  // Convert projectId to string for comparison
  const projectIdStr = typeof sampleProjectId === 'object' 
    ? (sampleProjectId as ObjectId).toString() 
    : sampleProjectId;
    
  // Sample project structure
  const sampleStructure = {
    projectId: projectIdStr,
    structureId: `structure-${projectIdStr}`,
    name: 'Sample Project Structure',
    version: 1,
    rootDirectory: {
      name: 'root',
      path: '/',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: '/src',
          type: 'directory',
          children: [
            {
              name: 'components',
              path: '/src/components',
              type: 'directory',
              children: []
            },
            {
              name: 'pages',
              path: '/src/pages',
              type: 'directory',
              children: []
            }
          ]
        },
        {
          name: 'public',
          path: '/public',
          type: 'directory',
          children: []
        }
      ]
    },
    metadata: {
      createdBy: 'system',
      status: 'active',
      tags: ['sample']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return seedCollection({
    collection: 'projectStructures',
    data: [sampleStructure],
    identifierField: 'structureId',
    environment,
    forceUpdate: true // Override with latest structure
  });
}

/**
 * Seed sample files
 */
export async function seedSampleFiles(
  environment: 'development' | 'production' | 'all' = 'development',
  projectId?: string | ObjectId
) {
  const sampleProjectId = projectId || 'sample-project';
  
  // Convert projectId to string for comparison
  const projectIdStr = typeof sampleProjectId === 'object' 
    ? (sampleProjectId as ObjectId).toString() 
    : sampleProjectId;
    
  // Sample files
  const sampleFiles = [
    {
      projectId: projectIdStr,
      fileId: `file-${projectIdStr}-1`,
      path: '/src/components',
      filename: 'Header.jsx',
      content: `import React from 'react';

const Header = () => {
  return (
    <header className="app-header">
      <h1>Sample Project</h1>
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;`,
      language: 'jsx',
      size: 288,
      version: 1,
      hash: 'abc123',
      metadata: {
        generatedBy: 'system',
        purpose: 'sample',
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      projectId: projectIdStr,
      fileId: `file-${projectIdStr}-2`,
      path: '/src/pages',
      filename: 'index.jsx',
      content: `import React from 'react';
import Header from '../components/Header';

const HomePage = () => {
  return (
    <div className="home-page">
      <Header />
      <main>
        <h2>Welcome to the Sample Project</h2>
        <p>This is a sample project generated by G.R.I.P.</p>
      </main>
    </div>
  );
};

export default HomePage;`,
      language: 'jsx',
      size: 324,
      version: 1,
      hash: 'def456',
      metadata: {
        generatedBy: 'system',
        purpose: 'sample',
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      projectId: projectIdStr,
      fileId: `file-${projectIdStr}-3`,
      path: '/',
      filename: 'package.json',
      content: `{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "A sample project generated by G.R.I.P.",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^12.0.0",
    "react": "^17.0.0",
    "react-dom": "^17.0.0"
  }
}`,
      language: 'json',
      size: 289,
      version: 1,
      hash: 'ghi789',
      metadata: {
        generatedBy: 'system',
        purpose: 'sample',
      },
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  return seedCollection({
    collection: 'projectFiles',
    data: sampleFiles,
    identifierField: 'fileId',
    environment,
    forceUpdate: false // Don't overwrite existing files
  });
}

/**
 * Seed sample tasks
 */
export async function seedSampleTasks(
  environment: 'development' | 'production' | 'all' = 'development',
  projectId?: string | ObjectId
) {
  const sampleProjectId = projectId || 'sample-project';
  
  // Convert projectId to string for comparison
  const projectIdStr = typeof sampleProjectId === 'object' 
    ? (sampleProjectId as ObjectId).toString() 
    : sampleProjectId;
    
  // Sample tasks
  const sampleTasks = [
    {
      projectId: projectIdStr,
      name: 'Build Project',
      description: 'Build the project using webpack',
      type: 'build',
      status: 'completed',
      priority: 'normal',
      command: 'npm run build',
      args: [],
      retryCount: 0,
      maxRetries: 3,
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() - 3540000),   // 59 minutes ago
      output: 'Build completed successfully\n\nWebpack 5.82.0 compiled successfully',
      dependencies: [],
      metadata: {
        createdBy: 'system',
        phase: 'deployment',
        step: 'build'
      },
      createdAt: new Date(Date.now() - 3700000),
      updatedAt: new Date(Date.now() - 3540000)
    },
    {
      projectId: projectIdStr,
      name: 'Run Tests',
      description: 'Run Jest tests with coverage',
      type: 'test',
      status: 'failed',
      priority: 'high',
      command: 'npm test',
      args: ['--coverage'],
      retryCount: 1,
      maxRetries: 3,
      lastError: 'Tests failed: Expected values to match',
      startTime: new Date(Date.now() - 7200000), // 2 hours ago
      endTime: new Date(Date.now() - 7140000),   // 1 hour 59 minutes ago
      output: 'FAIL src/components/Button.test.tsx\n\nExpected: true\nReceived: false',
      dependencies: [],
      metadata: {
        createdBy: 'system',
        phase: 'testing',
        step: 'unit-tests'
      },
      createdAt: new Date(Date.now() - 7300000),
      updatedAt: new Date(Date.now() - 7140000)
    },
    {
      projectId: projectIdStr,
      name: 'Deploy to Production',
      description: 'Deploy the application to production environment',
      type: 'deploy',
      status: 'queued',
      priority: 'critical',
      command: 'npm run deploy:prod',
      args: [],
      retryCount: 0,
      maxRetries: 2,
      dependencies: [],
      metadata: {
        createdBy: 'system',
        phase: 'deployment',
        step: 'production'
      },
      createdAt: new Date(Date.now() - 1800000),
      updatedAt: new Date(Date.now() - 1800000)
    },
    {
      projectId: projectIdStr,
      name: 'Analyze Code',
      description: 'Run static code analysis',
      type: 'analyze',
      status: 'scheduled',
      priority: 'low',
      command: 'npm run lint',
      args: ['--fix'],
      retryCount: 0,
      maxRetries: 1,
      scheduledFor: new Date(Date.now() + 3600000), // 1 hour from now
      dependencies: [],
      metadata: {
        createdBy: 'system',
        phase: 'quality',
        step: 'linting'
      },
      createdAt: new Date(Date.now() - 900000),
      updatedAt: new Date(Date.now() - 900000)
    }
  ];
  
  return seedCollection({
    collection: 'tasks',
    data: sampleTasks,
    identifierField: 'name',
    environment,
    forceUpdate: false // Don't overwrite existing tasks
  });
}

/**
 * Seed all essential data
 */
export async function seedAllData(
  environment: 'development' | 'production' | 'all' = 'development',
  projectId?: string | ObjectId
) {
  console.log(`Seeding all data for environment: ${environment}`);
  
  const results = {
    buildLogs: await seedSampleBuildLogs(environment, projectId),
    projectStructure: await seedSampleProjectStructure(environment, projectId),
    files: await seedSampleFiles(environment, projectId),
    tasks: await seedSampleTasks(environment, projectId)
  };
  
  console.log('Seeding completed:', results);
  return results;
} 