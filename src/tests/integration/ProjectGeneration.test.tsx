import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeGenerator } from '@/components/project/CodeGenerator';
import { PlanGenerator } from '@/components/project/PlanGenerator';
import { ProjectNavigation } from '@/components/project/ProjectNavigation';

// Mock project context
jest.mock('@/hooks/useProject', () => ({
  useProject: jest.fn(() => ({
    project: {
      id: 'test-project-id',
      title: 'Test Project',
      description: 'A test project for integration testing',
      repositoryUrl: 'https://github.com/test/test-repo',
      status: 'active'
    },
    loading: false,
    error: null
  }))
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/projects/test-project-id/generate'),
  useParams: jest.fn(() => ({ id: 'test-project-id' })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock API calls
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('/api/projects/test-project-id/plan')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'test-plan-id',
        projectId: 'test-project-id',
        phases: [
          {
            name: 'Setup Phase',
            steps: [
              { id: 'step-1', title: 'Initialize project', description: 'Set up project structure', status: 'completed' },
              { id: 'step-2', title: 'Install dependencies', description: 'Install required packages', status: 'in_progress' }
            ]
          },
          {
            name: 'Development Phase',
            steps: [
              { id: 'step-3', title: 'Create components', description: 'Develop UI components', status: 'pending' }
            ]
          }
        ]
      })
    });
  } else if (url.includes('/api/projects/test-project-id/files')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        files: [
          { id: 'file-1', path: '/src/App.js', content: 'function App() { return <div>Hello World</div>; }' },
          { id: 'file-2', path: '/src/index.js', content: 'import React from "react"; import ReactDOM from "react-dom";' }
        ]
      })
    });
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
});

// Create a wrapper component that simulates the project generation workflow
const ProjectGenerationFlow = () => {
  return (
    <div>
      <ProjectNavigation />
      <PlanGenerator projectId="test-project-id" />
      <CodeGenerator projectId="test-project-id" />
    </div>
  );
};

describe.skip('Project Generation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the project generation components together', async () => {
    render(<ProjectGenerationFlow />);
    
    // Wait for components to load
    await waitFor(() => {
      // ProjectNavigation should render navigation links
      expect(screen.getByText(/Project Overview/i)).toBeInTheDocument();
      
      // PlanGenerator should display the plan phases and steps
      expect(screen.getByText(/Setup Phase/i)).toBeInTheDocument();
      expect(screen.getByText(/Initialize project/i)).toBeInTheDocument();
      
      // CodeGenerator should display generated files
      expect(screen.getByText(/Generated Files/i)).toBeInTheDocument();
    });
  });

  it('allows navigating between project sections', async () => {
    const { getByText } = render(<ProjectGenerationFlow />);
    
    // Wait for navigation to render
    await waitFor(() => {
      expect(screen.getByText(/Project Overview/i)).toBeInTheDocument();
    });
    
    // Simulate clicking on a navigation link
    const overviewLink = getByText(/Project Overview/i);
    fireEvent.click(overviewLink);
    
    // The router push should have been called
    await waitFor(() => {
      const useRouter = require('next/navigation').useRouter;
      expect(useRouter().push).toHaveBeenCalled();
    });
  });

  it('displays project plan phases and steps correctly', async () => {
    render(<ProjectGenerationFlow />);
    
    // Wait for plan to load
    await waitFor(() => {
      expect(screen.getByText(/Setup Phase/i)).toBeInTheDocument();
      expect(screen.getByText(/Development Phase/i)).toBeInTheDocument();
      
      // Check for steps
      expect(screen.getByText(/Initialize project/i)).toBeInTheDocument();
      expect(screen.getByText(/Install dependencies/i)).toBeInTheDocument();
      expect(screen.getByText(/Create components/i)).toBeInTheDocument();
      
      // Check for step statuses
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.getByText(/in_progress/i)).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });
  });

  it('displays generated code files', async () => {
    render(<ProjectGenerationFlow />);
    
    // Wait for code generator to load files
    await waitFor(() => {
      expect(screen.getByText(/Generated Files/i)).toBeInTheDocument();
      expect(screen.getByText(/App.js/i)).toBeInTheDocument();
      expect(screen.getByText(/index.js/i)).toBeInTheDocument();
    });
    
    // Simulate clicking on a file to view its content
    const appFile = screen.getByText(/App.js/i);
    fireEvent.click(appFile);
    
    // File content should be displayed
    await waitFor(() => {
      expect(screen.getByText(/function App/i)).toBeInTheDocument();
    });
  });

  it('allows generating new code files', async () => {
    // Mock the code generation API call
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes('/api/projects/test-project-id/generate') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            file: {
              id: 'new-file',
              path: '/src/components/Button.js',
              content: 'function Button() { return <button>Click me</button>; }'
            }
          })
        });
      }
      
      // Handle other fetch calls
      return global.fetch.getMockImplementation()(url, options);
    });
    
    render(<ProjectGenerationFlow />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText(/Generated Files/i)).toBeInTheDocument();
    });
    
    // Find the generate button and click it
    const generateButton = screen.getByText(/Generate New Component/i);
    fireEvent.click(generateButton);
    
    // Wait for the component form to appear
    const componentNameInput = await screen.findByPlaceholderText(/Component name/i);
    fireEvent.change(componentNameInput, { target: { value: 'Button' } });
    
    // Submit the form
    const submitButton = screen.getByText(/Generate/i);
    fireEvent.click(submitButton);
    
    // Check that the new file appears in the list
    await waitFor(() => {
      expect(screen.getByText(/Button.js/i)).toBeInTheDocument();
    });
  });

  it('integrates plan generation with code generation', async () => {
    // Mock the plan generation API call
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes('/api/projects/test-project-id/plan/generate') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'new-plan-id',
            projectId: 'test-project-id',
            phases: [
              {
                name: 'Updated Phase',
                steps: [
                  { id: 'new-step', title: 'Create Button component', description: 'Add a reusable button', status: 'pending' }
                ]
              }
            ]
          })
        });
      }
      
      // Handle other fetch calls
      return global.fetch.getMockImplementation()(url, options);
    });
    
    render(<ProjectGenerationFlow />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText(/Setup Phase/i)).toBeInTheDocument();
    });
    
    // Find the regenerate plan button and click it
    const regeneratePlanButton = screen.getByText(/Regenerate Plan/i);
    fireEvent.click(regeneratePlanButton);
    
    // Wait for the updated plan to appear
    await waitFor(() => {
      expect(screen.getByText(/Updated Phase/i)).toBeInTheDocument();
      expect(screen.getByText(/Create Button component/i)).toBeInTheDocument();
    });
    
    // Now check if code generation is aware of the new plan
    const generateFromPlanButton = screen.getByText(/Generate from Plan/i);
    fireEvent.click(generateFromPlanButton);
    
    // Wait for generated files to update
    await waitFor(() => {
      expect(screen.getByText(/Button.js/i)).toBeInTheDocument();
    });
  });
}); 