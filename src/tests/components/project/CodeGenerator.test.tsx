import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeGenerator } from '@/components/project/CodeGenerator';
import * as toastModule from '@/components/ui/use-toast';

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

// Mock fetch
global.fetch = jest.fn();

describe.skip('CodeGenerator Component', () => {
  const mockProjectId = 'test-project-123';
  
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

  // Mock file structure
  const mockStructure = {
    structure: {
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
              {
                type: 'directory',
                name: 'components',
                path: '/src/components',
                children: []
              },
              {
                type: 'directory',
                name: 'pages',
                path: '/src/pages',
                children: []
              }
            ]
          }
        ]
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch to return different responses based on URL
    (global.fetch as jest.Mock).mockImplementation((url) => {
      // Templates fetch
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
          json: () => Promise.resolve(mockStructure)
        });
      }
      
      // Generate code
      if (url === `/api/projects/${mockProjectId}/files` && (global.fetch as jest.Mock).mock.calls.length > 2) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            id: 'file-123',
            content: 'Generated file content',
            path: '/src/components/Button.tsx'
          })
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  it('renders the component with loading state', async () => {
    render(<CodeGenerator projectId={mockProjectId} />);
    
    // Initial fetches should be triggered
    expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/templates`);
    expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/structure`);
    
    // Verify component renders with expected title
    expect(screen.getByText('Code Generator')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
      expect(screen.getByText('API Route')).toBeInTheDocument();
    });
  });

  it('displays template options after loading', async () => {
    render(<CodeGenerator projectId={mockProjectId} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
      expect(screen.getByText('API Route')).toBeInTheDocument();
      expect(screen.getByText('A functional React component')).toBeInTheDocument();
      expect(screen.getByText('Next.js API route')).toBeInTheDocument();
    });
  });

  it('allows selecting a template', async () => {
    render(<CodeGenerator projectId={mockProjectId} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Select the first template
    fireEvent.click(screen.getByText('React Component'));
    
    // Check if template details are shown
    await waitFor(() => {
      expect(screen.getByLabelText('File name')).toBeInTheDocument();
      expect(screen.getByText('Choose a location')).toBeInTheDocument();
    });
  });

  it('displays folder structure to select file location', async () => {
    render(<CodeGenerator projectId={mockProjectId} />);
    
    // Wait for templates and structure to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Select the first template
    fireEvent.click(screen.getByText('React Component'));
    
    // Wait for folder structure to load
    await waitFor(() => {
      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.getByText('components')).toBeInTheDocument();
      expect(screen.getByText('pages')).toBeInTheDocument();
    });
    
    // Select a directory
    fireEvent.click(screen.getByText('components'));
    
    // Verify directory selection
    await waitFor(() => {
      expect(screen.getByText('/src/components')).toBeInTheDocument();
    });
  });

  it('generates a file when form is submitted', async () => {
    render(<CodeGenerator projectId={mockProjectId} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Select the first template
    fireEvent.click(screen.getByText('React Component'));
    
    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText('File name')).toBeInTheDocument();
    });
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('File name'), { target: { value: 'Button' } });
    
    // Select a directory
    fireEvent.click(screen.getByText('components'));
    
    // Click generate button
    fireEvent.click(screen.getByText('Generate File'));
    
    // Verify API call
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
    
    // Verify toast notification
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('File Created'),
        })
      );
    });
  });

  it('shows preview of the file to be generated', async () => {
    render(<CodeGenerator projectId={mockProjectId} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Select the first template
    fireEvent.click(screen.getByText('React Component'));
    
    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText('File name')).toBeInTheDocument();
    });
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('File name'), { target: { value: 'Button' } });
    
    // Wait for preview to update
    await waitFor(() => {
      const previewContent = screen.getByText(/import React from "react";/);
      expect(previewContent).toBeInTheDocument();
      expect(screen.getByText(/export function Button/)).toBeInTheDocument();
    });
  });

  it('handles errors during file generation', async () => {
    // Mock fetch to return an error for file generation
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === `/api/projects/${mockProjectId}/templates`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplates)
        });
      }
      
      if (url === `/api/projects/${mockProjectId}/structure`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStructure)
        });
      }
      
      if (url === `/api/projects/${mockProjectId}/files`) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Failed to generate file' })
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
    
    render(<CodeGenerator projectId={mockProjectId} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Select the first template
    fireEvent.click(screen.getByText('React Component'));
    
    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText('File name')).toBeInTheDocument();
    });
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText('File name'), { target: { value: 'Button' } });
    
    // Select a directory
    fireEvent.click(screen.getByText('components'));
    
    // Click generate button
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

  it('resets the form when template selection is changed', async () => {
    render(<CodeGenerator projectId={mockProjectId} />);
    
    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
      expect(screen.getByText('API Route')).toBeInTheDocument();
    });
    
    // Select the first template
    fireEvent.click(screen.getByText('React Component'));
    
    // Wait for form to appear and fill it out
    await waitFor(() => {
      expect(screen.getByLabelText('File name')).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByLabelText('File name'), { target: { value: 'Button' } });
    
    // Switch to the second template
    fireEvent.click(screen.getByText('API Route'));
    
    // Check that form is reset (file name should be empty)
    await waitFor(() => {
      const fileNameInput = screen.getByLabelText('File name') as HTMLInputElement;
      expect(fileNameInput.value).toBe('');
    });
    
    // Preview should show API route template
    await waitFor(() => {
      expect(screen.getByText(/import { NextApiRequest, NextApiResponse } from "next";/)).toBeInTheDocument();
    });
  });
}); 