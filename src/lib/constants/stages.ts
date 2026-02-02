export interface Stage {
  id: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  dependencies: number[];
  action: string;
  details?: string;
}

export const PROJECT_STAGES: Stage[] = [
  {
    id: 1,
    name: 'Load Project Analysis',
    status: 'pending',
    dependencies: [],
    action: 'Loading analysis from MongoDB "test" collection',
    details: 'Loading...'
  },
  {
    id: 2,
    name: 'Initialize Project Environment',
    status: 'pending',
    dependencies: [1],
    action: 'Creating project structure',
    details: 'Project Analysis'
  },
  {
    id: 3,
    name: 'Clone Repository',
    status: 'pending',
    dependencies: [2],
    action: 'Downloading code from MongoDB',
    details: 'Project Environment'
  },
  {
    id: 4,
    name: 'Configure Build System',
    status: 'pending',
    dependencies: [3],
    action: 'Setting up build tools',
    details: 'Repository'
  },
  {
    id: 5,
    name: 'Set up Testing Framework',
    status: 'pending',
    dependencies: [4],
    action: 'Configuring test environment',
    details: 'Build System'
  },
  {
    id: 6,
    name: 'Configure Development Tools',
    status: 'pending',
    dependencies: [5],
    action: 'Setting up development tools',
    details: 'Testing Framework'
  },
  {
    id: 7,
    name: 'Create Component Hierarchy',
    status: 'pending',
    dependencies: [6],
    action: 'Generating component structure',
    details: 'Development Tools'
  },
  {
    id: 8,
    name: 'Set up State Management',
    status: 'pending',
    dependencies: [7],
    action: 'Configuring state management',
    details: 'Component Hierarchy'
  },
  {
    id: 9,
    name: 'Configure API Integration',
    status: 'pending',
    dependencies: [8],
    action: 'Setting up API clients',
    details: 'State Management'
  },
  {
    id: 10,
    name: 'Implement Core Features',
    status: 'pending',
    dependencies: [9],
    action: 'Creating feature components',
    details: 'API Integration'
  },
  {
    id: 11,
    name: 'Add UI Components',
    status: 'pending',
    dependencies: [10],
    action: 'Implementing design system',
    details: 'Core Features'
  },
  {
    id: 12,
    name: 'Set up Navigation',
    status: 'pending',
    dependencies: [11],
    action: 'Creating navigation structure',
    details: 'UI Components'
  },
  {
    id: 13,
    name: 'Implement Design System',
    status: 'pending',
    dependencies: [12],
    action: 'Setting up design system',
    details: 'Navigation'
  },
  {
    id: 14,
    name: 'Add Responsive Design',
    status: 'pending',
    dependencies: [13],
    action: 'Creating responsive layouts',
    details: 'Design System'
  },
  {
    id: 15,
    name: 'Set up Animations',
    status: 'pending',
    dependencies: [14],
    action: 'Configuring animations',
    details: 'Responsive Design'
  },
  {
    id: 16,
    name: 'Write Unit Tests',
    status: 'pending',
    dependencies: [15],
    action: 'Creating component tests',
    details: 'Animations'
  },
  {
    id: 17,
    name: 'Add Integration Tests',
    status: 'pending',
    dependencies: [16],
    action: 'Implementing feature tests',
    details: 'Unit Tests'
  },
  {
    id: 18,
    name: 'Configure CI/CD',
    status: 'pending',
    dependencies: [17],
    action: 'Setting up CI/CD pipeline',
    details: 'Integration Tests'
  },
  {
    id: 19,
    name: 'Optimize Build',
    status: 'pending',
    dependencies: [18],
    action: 'Configuring optimizations',
    details: 'CI/CD'
  },
  {
    id: 20,
    name: 'Add Performance Monitoring',
    status: 'pending',
    dependencies: [19],
    action: 'Setting up monitoring',
    details: 'Build Optimization'
  },
  {
    id: 21,
    name: 'Optimize Assets',
    status: 'pending',
    dependencies: [20],
    action: 'Optimizing assets',
    details: 'Performance Monitoring'
  },
  {
    id: 22,
    name: 'Prepare for Deployment',
    status: 'pending',
    dependencies: [21],
    action: 'Configuring production build',
    details: 'Asset Optimization'
  },
  {
    id: 23,
    name: 'Deploy Application',
    status: 'pending',
    dependencies: [22],
    action: 'Deploying to production',
    details: 'Deployment Prep'
  },
  {
    id: 24,
    name: 'Post-Launch Setup',
    status: 'pending',
    dependencies: [23],
    action: 'Setting up monitoring',
    details: 'Deployment'
  },
  {
    id: 25,
    name: 'Generate Documentation',
    status: 'pending',
    dependencies: [24],
    action: 'Creating documentation',
    details: 'Post-Launch'
  },
  {
    id: 26,
    name: 'Set up Maintenance Tools',
    status: 'pending',
    dependencies: [25],
    action: 'Configuring maintenance',
    details: 'Documentation'
  },
  {
    id: 27,
    name: 'Create Maintenance Schedule',
    status: 'pending',
    dependencies: [26],
    action: 'Setting up schedules',
    details: 'Maintenance Tools'
  }
]; 
