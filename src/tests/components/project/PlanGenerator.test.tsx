import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlanGenerator } from '@/components/project/PlanGenerator';
import * as toastModule from '@/components/ui/use-toast';

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('PlanGenerator Component', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch to return different responses based on URL
    (global.fetch as jest.Mock).mockImplementation((url) => {
      // Initial plan fetch
      if (url === `/api/projects/${mockProjectId}/plan` && (global.fetch as jest.Mock).mock.calls.length === 1) {
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
      
      // Generate plan
      if (url === `/api/projects/${mockProjectId}/plan` && (global.fetch as jest.Mock).mock.calls.length > 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlanData)
        });
      }
      
      // Generate files
      if (url === `/api/projects/${mockProjectId}/files/generate`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
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
    render(<PlanGenerator projectId={mockProjectId} />);
    
    // Initial fetch should be triggered
    expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/plan`);
    
    // Verify component renders with expected title
    expect(screen.getByText('Project Planning Engine')).toBeInTheDocument();
    
    // Verify buttons are present (might be disabled during loading)
    expect(screen.getByText('Generate Plan')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByText('Generate Files')).toBeInTheDocument();
    });
  });

  it('shows plan data after successful fetch', async () => {
    render(<PlanGenerator projectId={mockProjectId} />);
    
    // Wait for plan data to be displayed
    await waitFor(() => {
      expect(screen.getByText('Structure')).toBeInTheDocument();
      expect(screen.getByText('Test Project Structure')).toBeInTheDocument();
      expect(screen.getByText('A test project structure')).toBeInTheDocument();
    });
    
    // Check if all tabs are present
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /phases/i })).toBeInTheDocument();
  });

  it('handles generate plan button click', async () => {
    render(<PlanGenerator projectId={mockProjectId} />);
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByText('Generate Files')).toBeInTheDocument();
    });
    
    // Click generate plan button
    fireEvent.click(screen.getByText('Generate Plan'));
    
    // Verify API call
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
    
    // Verify toast notification
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Plan Generated',
          description: 'Your project plan was created successfully',
        })
      );
    });
  });

  it('handles generate files button click', async () => {
    render(<PlanGenerator projectId={mockProjectId} />);
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByText('Generate Files')).toBeInTheDocument();
    });
    
    // Click generate files button
    fireEvent.click(screen.getByText('Generate Files'));
    
    // Verify API call
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
    
    // Verify toast notification
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Files Generated',
          description: 'Project files have been created based on the plan',
        })
      );
    });
  });

  it('handles error responses', async () => {
    // Mock fetch to return an error
    (global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      });
    });
    
    render(<PlanGenerator projectId={mockProjectId} />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });
  });

  it('navigates between tabs correctly', async () => {
    render(<PlanGenerator projectId={mockProjectId} />);
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByText('Generate Files')).toBeInTheDocument();
    });
    
    // Overview tab should be active by default
    expect(screen.getByText('Structure')).toBeInTheDocument();
    
    // Click on Files tab
    fireEvent.click(screen.getByRole('tab', { name: /files/i }));
    
    // Wait for files tab content to be displayed
    await waitFor(() => {
      expect(screen.getByText(/files ready to generate/i)).toBeInTheDocument();
    });
    
    // Click on Phases tab
    fireEvent.click(screen.getByRole('tab', { name: /phases/i }));
    
    // Wait for phases tab content to be displayed
    await waitFor(() => {
      expect(screen.getByText('Setup Phase')).toBeInTheDocument();
      expect(screen.getByText('Initialize project')).toBeInTheDocument();
      expect(screen.getByText('Setup dependencies')).toBeInTheDocument();
    });
  });

  it('refreshes plan data when refresh button is clicked', async () => {
    render(<PlanGenerator projectId={mockProjectId} />);
    
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByText('Generate Files')).toBeInTheDocument();
    });
    
    // Reset fetch mock call count
    (global.fetch as jest.Mock).mockClear();
    
    // Click refresh button
    fireEvent.click(screen.getByText('Refresh'));
    
    // Verify API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/plan`);
    });
  });
}); 