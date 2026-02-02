import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { BuildMonitor } from '@/components/admin/BuildMonitor';
import { FileExplorer } from '@/components/admin/FileExplorer';
import { TaskManager } from '@/components/admin/TaskManager';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  })),
  usePathname: jest.fn(() => '/admin/projects/test-project-id'),
  useParams: jest.fn(() => ({ projectId: 'test-project-id' })),
  useSearchParams: jest.fn(() => new URLSearchParams())
}));

// Mock the API calls
global.fetch = jest.fn().mockImplementation((url) => {
  // Mock project data
  if (url.includes('/api/projects/test-project-id')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'test-project-id',
        title: 'Test Project',
        description: 'A test project for e2e testing',
        repositoryUrl: 'https://github.com/test/test-repo',
        status: 'active',
        createdAt: new Date().toISOString()
      })
    });
  }
  
  // Mock build data
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
              { level: 'success', message: 'Build completed successfully', timestamp: new Date().toISOString() }
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
  }
  
  // Mock file data
  if (url.includes('/api/admin/files')) {
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
  
  // Mock task data
  if (url.includes('/api/admin/tasks')) {
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

// Create an AdminWorkflowSimulation component
const AdminWorkflowSimulation = () => {
  const [selectedBuildId, setSelectedBuildId] = React.useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = React.useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  
  return (
    <div className="admin-workflow-simulation">
      <h1>Admin Dashboard</h1>
      
      <div className="admin-section">
        <h2>Build Monitor</h2>
        <BuildMonitor 
          projectId="test-project-id" 
          onBuildSelect={(buildId) => setSelectedBuildId(buildId)}
        />
        {selectedBuildId && (
          <div className="selected-build">
            <h3>Selected Build: {selectedBuildId}</h3>
          </div>
        )}
      </div>
      
      <div className="admin-section">
        <h2>File Explorer</h2>
        <FileExplorer 
          projectId="test-project-id" 
          onFileSelect={(filePath) => setSelectedFilePath(filePath)}
        />
        {selectedFilePath && (
          <div className="selected-file">
            <h3>Selected File: {selectedFilePath}</h3>
          </div>
        )}
      </div>
      
      <div className="admin-section">
        <h2>Task Manager</h2>
        <TaskManager 
          projectId="test-project-id" 
          onTaskSelect={(taskId) => setSelectedTaskId(taskId)}
        />
        {selectedTaskId && (
          <div className="selected-task">
            <h3>Selected Task: {selectedTaskId}</h3>
          </div>
        )}
      </div>
    </div>
  );
};

describe('Admin Workflow End-to-End', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the admin dashboard components', async () => {
    render(<AdminWorkflowSimulation />);
    
    // Wait for the admin dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Build Monitor/i)).toBeInTheDocument();
      expect(screen.getByText(/File Explorer/i)).toBeInTheDocument();
      expect(screen.getByText(/Task Manager/i)).toBeInTheDocument();
    });
  });

  it('displays build information and logs', async () => {
    render(<AdminWorkflowSimulation />);
    
    // Wait for the build monitor to load
    await waitFor(() => {
      expect(screen.getByText(/Build Monitor/i)).toBeInTheDocument();
    });
    
    // Verify that builds are displayed
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText(/in_progress/i)).toBeInTheDocument();
    
    // Select a build
    const completedBuild = screen.getByText(/completed/i);
    fireEvent.click(completedBuild);
    
    // Verify that build logs are displayed
    await waitFor(() => {
      expect(screen.getByText(/Selected Build: build-1/i)).toBeInTheDocument();
      expect(screen.getByText(/Build started/i)).toBeInTheDocument();
      expect(screen.getByText(/Build completed successfully/i)).toBeInTheDocument();
    });
  });

  it('navigates and displays project files', async () => {
    render(<AdminWorkflowSimulation />);
    
    // Wait for the file explorer to load
    await waitFor(() => {
      expect(screen.getByText(/File Explorer/i)).toBeInTheDocument();
    });
    
    // Verify that files are displayed
    expect(screen.getByText(/App.js/i)).toBeInTheDocument();
    expect(screen.getByText(/index.js/i)).toBeInTheDocument();
    
    // Select a file
    const appFile = screen.getByText(/App.js/i);
    fireEvent.click(appFile);
    
    // Verify that file content is displayed
    await waitFor(() => {
      expect(screen.getByText(/Selected File: \/src\/App.js/i)).toBeInTheDocument();
      expect(screen.getByText(/function App/i)).toBeInTheDocument();
    });
  });

  it('manages tasks in the task manager', async () => {
    // Mock task management API endpoints
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes('/api/admin/tasks/task-2') && options?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'task-2',
            type: 'test',
            status: 'paused',
            command: 'npm test',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          })
        });
      }
      
      // Handle other fetch calls with the original mock
      return global.fetch.getMockImplementation()(url, options);
    });
    
    render(<AdminWorkflowSimulation />);
    
    // Wait for the task manager to load
    await waitFor(() => {
      expect(screen.getByText(/Task Manager/i)).toBeInTheDocument();
    });
    
    // Verify that tasks are displayed
    expect(screen.getByText(/npm run build/i)).toBeInTheDocument();
    expect(screen.getByText(/npm test/i)).toBeInTheDocument();
    
    // Select a task
    const testTask = screen.getByText(/npm test/i);
    fireEvent.click(testTask);
    
    // Verify that task details are displayed
    await waitFor(() => {
      expect(screen.getByText(/Selected Task: task-2/i)).toBeInTheDocument();
    });
    
    // Find the pause button for the in-progress task and click it
    const pauseButton = screen.getByLabelText(/pause task/i);
    fireEvent.click(pauseButton);
    
    // Verify that the task status was updated
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

  it('integrates build monitoring with task management', async () => {
    // Mock build and task interaction
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes('/api/admin/builds/build-2/stop') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'build-2',
            projectId: 'test-project-id',
            status: 'stopped',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            logs: [
              { level: 'info', message: 'Build started', timestamp: new Date().toISOString() },
              { level: 'warning', message: 'Build stopped by user', timestamp: new Date().toISOString() }
            ]
          })
        });
      }
      
      // Handle other fetch calls with the original mock
      return global.fetch.getMockImplementation()(url, options);
    });
    
    render(<AdminWorkflowSimulation />);
    
    // Wait for the admin dashboard to load
    await waitFor(() => {
      expect(screen.getByText(/Build Monitor/i)).toBeInTheDocument();
      expect(screen.getByText(/Task Manager/i)).toBeInTheDocument();
    });
    
    // Select the in-progress build
    const inProgressBuild = screen.getByText(/in_progress/i);
    fireEvent.click(inProgressBuild);
    
    // Verify build selection
    await waitFor(() => {
      expect(screen.getByText(/Selected Build: build-2/i)).toBeInTheDocument();
    });
    
    // Find the stop build button and click it
    const stopBuildButton = screen.getByLabelText(/stop build/i);
    fireEvent.click(stopBuildButton);
    
    // Verify that the stop build API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/builds/build-2/stop'),
        expect.objectContaining({ method: 'POST' })
      );
    });
    
    // Verify that related tasks are also updated
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/tasks/task-2'),
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('stopped')
        })
      );
    });
  });

  it('allows editing files through the admin interface', async () => {
    // Mock file update API
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes('/api/admin/files/file-1') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'file-1',
            path: '/src/App.js',
            content: 'function App() { return <div>Updated App</div>; }',
            updated: new Date().toISOString()
          })
        });
      }
      
      // Handle other fetch calls with the original mock
      return global.fetch.getMockImplementation()(url, options);
    });
    
    render(<AdminWorkflowSimulation />);
    
    // Wait for the file explorer to load
    await waitFor(() => {
      expect(screen.getByText(/File Explorer/i)).toBeInTheDocument();
    });
    
    // Select a file
    const appFile = screen.getByText(/App.js/i);
    fireEvent.click(appFile);
    
    // Wait for file content to load
    await waitFor(() => {
      expect(screen.getByText(/function App/i)).toBeInTheDocument();
    });
    
    // Find the edit button and click it
    const editButton = screen.getByLabelText(/edit file/i);
    fireEvent.click(editButton);
    
    // Find the editor and modify the content
    const editor = screen.getByTestId('code-editor');
    fireEvent.change(editor, { target: { value: 'function App() { return <div>Updated App</div>; }' } });
    
    // Save the changes
    const saveButton = screen.getByText(/Save Changes/i);
    fireEvent.click(saveButton);
    
    // Verify that the file update API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/files/file-1'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('Updated App')
        })
      );
    });
    
    // Verify that the updated content is displayed
    await waitFor(() => {
      expect(screen.getByText(/Updated App/i)).toBeInTheDocument();
    });
  });
}); 