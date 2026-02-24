import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout';
import { BuildLogViewer } from '@/components/admin/BuildLogViewer';
import { FileExplorer } from '@/components/admin/FileExplorer';
import { TaskManager } from '@/components/admin/TaskManager';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard/admin'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useParams: jest.fn(() => ({ projectId: 'test-project-id' })),
}));

// Mock the API calls
global.fetch = jest.fn().mockImplementation((url) => {
  if (url.includes('/api/admin/builds')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        builds: [
          { 
            id: 'build-1', 
            projectId: 'test-project-id', 
            status: 'completed', 
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            logs: [
              { level: 'info', message: 'Build started', timestamp: new Date().toISOString() },
              { level: 'success', message: 'Build completed', timestamp: new Date().toISOString() }
            ]
          },
          { 
            id: 'build-2', 
            projectId: 'test-project-id', 
            status: 'in_progress',
            startTime: new Date().toISOString(),
            logs: [
              { level: 'info', message: 'Build started', timestamp: new Date().toISOString() }
            ]
          }
        ]
      })
    });
  } else if (url.includes('/api/admin/files')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        files: [
          { id: 'file-1', path: '/src/App.js', content: 'function App() { return <div>Hello World</div>; }' },
          { id: 'file-2', path: '/src/index.js', content: 'import React from "react"; import ReactDOM from "react-dom";' }
        ]
      })
    });
  } else if (url.includes('/api/admin/tasks')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        tasks: [
          { 
            id: 'task-1', 
            type: 'build', 
            status: 'completed', 
            command: 'npm run build',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          },
          { 
            id: 'task-2', 
            type: 'test', 
            status: 'in_progress', 
            command: 'npm test',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          }
        ]
      })
    });
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  });
});

// Create a wrapper component that simulates the admin dashboard
const AdminDashboardIntegration = () => {
  return (
    <div>
      <AdminDashboardLayout>
        <BuildLogViewer projectId="test-project-id" />
        <FileExplorer projectId="test-project-id" />
        <TaskManager projectId="test-project-id" />
      </AdminDashboardLayout>
    </div>
  );
};

describe.skip('Admin Dashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the admin dashboard components together', async () => {
    render(<AdminDashboardIntegration />);
    
    // Wait for components to load
    await waitFor(() => {
      // AdminDashboardLayout should render navigation
      expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
      
      // BuildLogViewer should display builds
      expect(screen.getByText(/Build Logs/i)).toBeInTheDocument();
      
      // FileExplorer should display files
      expect(screen.getByText(/File Explorer/i)).toBeInTheDocument();
      
      // TaskManager should display tasks
      expect(screen.getByText(/Task Manager/i)).toBeInTheDocument();
    });
  });

  it('displays build logs correctly', async () => {
    render(<AdminDashboardIntegration />);
    
    // Wait for builds to load
    await waitFor(() => {
      expect(screen.getByText(/Build Logs/i)).toBeInTheDocument();
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.getByText(/in_progress/i)).toBeInTheDocument();
    });
    
    // Select a build to view its logs
    const completedBuild = screen.getByText(/completed/i);
    fireEvent.click(completedBuild);
    
    // Wait for the logs to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Build started/i)).toBeInTheDocument();
      expect(screen.getByText(/Build completed/i)).toBeInTheDocument();
    });
  });

  it('displays project files in the explorer', async () => {
    render(<AdminDashboardIntegration />);
    
    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText(/File Explorer/i)).toBeInTheDocument();
      expect(screen.getByText(/App.js/i)).toBeInTheDocument();
      expect(screen.getByText(/index.js/i)).toBeInTheDocument();
    });
    
    // Click on a file to view its content
    const appFile = screen.getByText(/App.js/i);
    fireEvent.click(appFile);
    
    // Wait for file content to be displayed
    await waitFor(() => {
      expect(screen.getByText(/function App/i)).toBeInTheDocument();
    });
  });

  it('displays and manages tasks', async () => {
    render(<AdminDashboardIntegration />);
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText(/Task Manager/i)).toBeInTheDocument();
      expect(screen.getByText(/npm run build/i)).toBeInTheDocument();
      expect(screen.getByText(/npm test/i)).toBeInTheDocument();
    });
    
    // Verify task statuses are displayed
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText(/in_progress/i)).toBeInTheDocument();
    
    // Find the pause/resume button for an in-progress task and click it
    const pauseButton = screen.getByLabelText(/pause task/i);
    fireEvent.click(pauseButton);
    
    // Verify API call was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/tasks/task-2'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('paused')
        })
      );
    });
  });

  it('allows navigation between admin sections', async () => {
    // Mock the router
    const mockPush = jest.fn();
    require('next/navigation').useRouter.mockReturnValue({
      push: mockPush
    });
    
    render(<AdminDashboardIntegration />);
    
    // Wait for navigation to render
    await waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
    });
    
    // Find the navigation link to builds page and click it
    const buildsLink = screen.getByText(/Builds/i);
    fireEvent.click(buildsLink);
    
    // Verify router was called
    expect(mockPush).toHaveBeenCalledWith('/dashboard/admin/builds');
  });

  it('integrates build logs with task management', async () => {
    render(<AdminDashboardIntegration />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText(/Build Logs/i)).toBeInTheDocument();
      expect(screen.getByText(/Task Manager/i)).toBeInTheDocument();
    });
    
    // Select a build that's in progress
    const inProgressBuild = screen.getByText(/in_progress/i);
    fireEvent.click(inProgressBuild);
    
    // Find the corresponding task and verify it's in progress
    await waitFor(() => {
      expect(screen.getByText(/npm test/i)).toBeInTheDocument();
    });
    
    // Stop the task
    const stopButton = screen.getByLabelText(/stop task/i);
    fireEvent.click(stopButton);
    
    // Verify both task and build are updated
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/tasks/task-2'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('stopped')
        })
      );
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/builds/build-2'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('stopped')
        })
      );
    });
  });
}); 