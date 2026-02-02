import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlanGenerator } from '@/components/project/PlanGenerator';
import { CodeGenerator } from '@/components/project/CodeGenerator';
import * as toastModule from '@/components/ui/use-toast';

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

// Mock fetch
global.fetch = jest.fn();

// Create a wrapper component for testing integration
const PlanCodeWorkflow = ({ projectId }: { projectId: string }) => {
  return (
    <div data-testid="integration-container">
      <h1>Project Development Workflow</h1>
      <div className="mb-8">
        <h2>Step 1: Generate Project Plan</h2>
        <PlanGenerator projectId={projectId} />
      </div>
      <div>
        <h2>Step 2: Generate Code Files</h2>
        <CodeGenerator projectId={projectId} />
      </div>
    </div>
  );
};

describe('Plan to Code Integration', () => {
  const mockProjectId = 'test-project-123';
  
  // Mock plan data
  const mockPlanData = {
    planId: 'plan-123',
    structure: {
      name: 'Test Project Structure',
      description: 'A test project structure',
      fileHierarchy: {
        type: 'directory',
        name: 'root',
        path: '/',
        children: [
          {
            type: 'directory',
            name: 'src',
            path: '/src',
            children: [
              { type: 'file', name: 'index.js', path: '/src/index.js' },
              { type: 'file', name: 'app.js', path: '/src/app.js' }
            ]
          },
          {
            type: 'file',
            name: 'package.json',
            path: '/package.json'
          }
        ]
      }
    },
    phases: [
      {
        name: 'Setup Phase',
        description: 'Initial project setup',
        steps: [
          { id: 1, name: 'Initialize project', status: 'completed' },
          { id: 2, name: 'Setup dependencies', status: 'in_progress' },
          { id: 3, name: 'Configure environment', status: 'pending' }
        ]
      }
    ]
  };

  // Mock files to generate
  const mockFilesToGenerate = {
    files: [
      { name: 'index.js', path: '/src/index.js' },
      { name: 'app.js', path: '/src/app.js' },
      { name: 'package.json', path: '/package.json' }
    ]
  };

  // Mock file templates
  const mockTemplates = {
    templates: [
      {
        id: 'template-1',
        name: 'React Component',
        description: 'A functional React component',
        language: 'typescript',
        framework: 'react',
        template: 'import React from "react";\n\ninterface {{name}}Props {\n  // Props here\n}\n\nexport function {{name}}({ ...props }: {{name}}Props) {\n  return (\n    <div>\n      {/* Component content */}\n    </div>\n  );\n}',
        placeholders: ['name']
      },
      {
        id: 'template-2',
        name: 'API Route',
        description: 'Next.js API route',
        language: 'typescript',
        framework: 'nextjs',
        template: 'import { NextApiRequest, NextApiResponse } from "next";\n\nexport default async function {{name}}(req: NextApiRequest, res: NextApiResponse) {\n  if (req.method === "GET") {\n    // Handle GET request\n    return res.status(200).json({ success: true });\n  }\n\n  return res.status(405).json({ error: "Method not allowed" });\n}',
        placeholders: ['name']
      }
    ]
  };

  // Mock generated file
  const mockGeneratedFile = {
    id: 'file-123',
    content: 'Generated file content',
    path: '/src/components/Button.tsx'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock MongoDB integration via fetch responses
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      // Initial plan fetch
      if (url === `/api/projects/${mockProjectId}/plan` && !options) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlanData)
        });
      }
      
      // Generate plan
      if (url === `/api/projects/${mockProjectId}/plan` && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlanData)
        });
      }
      
      // Files to generate fetch
      if (url === `/api/projects/${mockProjectId}/files/generation`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFilesToGenerate)
        });
      }
      
      // Generate files from plan
      if (url === `/api/projects/${mockProjectId}/files/generate`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, generatedFiles: 3 })
        });
      }
      
      // File templates
      if (url === `/api/projects/${mockProjectId}/templates`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplates)
        });
      }
      
      // Structure fetch
      if (url === `/api/projects/${mockProjectId}/structure`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ structure: mockPlanData.structure })
        });
      }
      
      // Generate individual file
      if (url === `/api/projects/${mockProjectId}/files` && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGeneratedFile)
        });
      }
      
      console.warn('Unhandled fetch request:', url, options);
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  it('renders both components in the workflow', async () => {
    render(<PlanCodeWorkflow projectId={mockProjectId} />);
    
    // Verify both components are rendered
    expect(screen.getByText('Project Development Workflow')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Generate Project Plan')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Generate Code Files')).toBeInTheDocument();
    
    // Verify PlanGenerator renders
    await waitFor(() => {
      expect(screen.getByText('Project Planning Engine')).toBeInTheDocument();
    });
    
    // Verify CodeGenerator renders
    await waitFor(() => {
      expect(screen.getByText('Code Generator')).toBeInTheDocument();
    });
  });

  it('loads plan data and code templates from MongoDB', async () => {
    render(<PlanCodeWorkflow projectId={mockProjectId} />);
    
    // Verify plan data is loaded
    await waitFor(() => {
      expect(screen.getByText('Generate Files')).toBeInTheDocument();
      expect(screen.getByText('Test Project Structure')).toBeInTheDocument();
    });
    
    // Verify code templates are loaded
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
      expect(screen.getByText('API Route')).toBeInTheDocument();
    });
    
    // Verify MongoDB API calls
    expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/plan`);
    expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/templates`);
  });

  it('generates a plan and then creates code files from it', async () => {
    render(<PlanCodeWorkflow projectId={mockProjectId} />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('Generate Plan')).toBeInTheDocument();
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Step 1: Generate a plan
    fireEvent.click(screen.getByText('Generate Plan'));
    
    // Verify plan generation API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/plan`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
    
    // Wait for plan generation to complete
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Plan Generated',
          description: 'Your project plan was created successfully',
        })
      );
    });
    
    // Step 2: Generate files from plan
    fireEvent.click(screen.getByText('Generate Files'));
    
    // Verify file generation API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/files/generate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.any(String),
        })
      );
    });
    
    // Verify successful file generation
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Files Generated',
          description: 'Project files have been created based on the plan',
        })
      );
    });
  });

  it('creates a custom file using code templates', async () => {
    render(<PlanCodeWorkflow projectId={mockProjectId} />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Select a template
    fireEvent.click(screen.getByText('React Component'));
    
    // Wait for template form to load
    await waitFor(() => {
      expect(screen.getByLabelText('File name')).toBeInTheDocument();
    });
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('File name'), { target: { value: 'Button' } });
    
    // Select a directory (when it becomes available)
    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument();
    });
    
    // Click on components directory
    fireEvent.click(screen.getByText('components'));
    
    // Generate the file
    fireEvent.click(screen.getByText('Generate File'));
    
    // Verify API call to generate individual file
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/files`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.any(String),
        })
      );
    });
    
    // Verify success message
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('File Created'),
        })
      );
    });
  });

  it('handles errors gracefully during the workflow', async () => {
    // Mock API errors for this test
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url === `/api/projects/${mockProjectId}/plan`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlanData)
        });
      }
      
      if (url === `/api/projects/${mockProjectId}/templates`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplates)
        });
      }
      
      if (url === `/api/projects/${mockProjectId}/structure`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ structure: mockPlanData.structure })
        });
      }
      
      // Simulate errors for plan generation and file generation
      if (url === `/api/projects/${mockProjectId}/plan` && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Failed to generate plan' })
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      });
    });
    
    render(<PlanCodeWorkflow projectId={mockProjectId} />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('Generate Plan')).toBeInTheDocument();
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Try to generate a plan (will fail)
    fireEvent.click(screen.getByText('Generate Plan'));
    
    // Verify error message
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to generate plan')).toBeInTheDocument();
    });
    
    // Select a template
    fireEvent.click(screen.getByText('React Component'));
    
    // Wait for template form to load
    await waitFor(() => {
      expect(screen.getByLabelText('File name')).toBeInTheDocument();
    });
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('File name'), { target: { value: 'Button' } });
    
    // Select a directory (when it becomes available)
    await waitFor(() => {
      const fileTree = screen.getByText('src');
      expect(fileTree).toBeInTheDocument();
      fireEvent.click(fileTree);
    });
    
    // Generate the file (will fail)
    fireEvent.click(screen.getByText('Generate File'));
    
    // Verify error toast
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Error'),
          variant: 'destructive',
        })
      );
    });
  });

  it('persists and reuses plan data between components', async () => {
    render(<PlanCodeWorkflow projectId={mockProjectId} />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText('Generate Plan')).toBeInTheDocument();
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Verify plan data is displayed in both components
    await waitFor(() => {
      // Plan structure in PlanGenerator
      expect(screen.getByText('Test Project Structure')).toBeInTheDocument();
      
      // Directory structure in CodeGenerator matches plan structure
      expect(screen.getAllByText('src').length).toBeGreaterThanOrEqual(1);
    });
    
    // Try generating files directly (without regenerating plan)
    fireEvent.click(screen.getByText('Generate Files'));
    
    // Verify file generation succeeds using existing plan
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Files Generated',
          description: 'Project files have been created based on the plan',
        })
      );
    });
    
    // Verify file generation API received correct plan ID
    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls;
      const fileGenerationCall = calls.find(call => 
        call[0] === `/api/projects/${mockProjectId}/files/generate` && 
        call[1]?.method === 'POST'
      );
      
      expect(fileGenerationCall).toBeTruthy();
      
      // Parse the body to check plan ID
      const body = JSON.parse(fileGenerationCall[1].body);
      expect(body.planId).toBe(mockPlanData.planId);
    });
  });
}); 