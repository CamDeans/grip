import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider';
import { EnhancedChat } from '@/components/chat/EnhancedChatInterface';
import { ProjectContextDisplay } from '@/components/chat/ProjectContextDisplay';
import { TaskProgressIndicator } from '@/components/chat/TaskProgressIndicator';
import * as useWebSocketModule from '@/hooks/useWebSocket';
import * as toastModule from '@/components/ui/use-toast';

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/dashboard/projects/test-project-id/enhanced-chat'),
  useParams: jest.fn().mockReturnValue({ id: 'test-project-id' }),
  useSearchParams: jest.fn().mockReturnValue(new URLSearchParams('task=develop')),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock the WebSocket hook
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

// Mock fetch
global.fetch = jest.fn();

// Create a test wrapper component that combines EnhancedChat with context components
const ChatSystemTestWrapper = ({ projectId, welcomeMessage }: { projectId: string, welcomeMessage?: string }) => {
  return (
    <EnhancedChatProvider projectId={projectId}>
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex flex-col">
            <div className="flex-shrink-0">
              <ProjectContextDisplay />
            </div>
            <div className="flex-shrink-0">
              <TaskProgressIndicator projectId={projectId} />
            </div>
            <div className="flex-1">
              <EnhancedChat 
                projectId={projectId} 
                welcomeMessage={welcomeMessage}
              />
            </div>
          </div>
        </div>
      </div>
    </EnhancedChatProvider>
  );
};

describe.skip('Chat System Integration', () => {
  const mockProjectId = 'test-project-123';
  
  // Mock project data
  const mockProject = {
    _id: mockProjectId,
    title: 'Test Project',
    description: 'A test project for integration testing',
    repository: {
      owner: 'test-user',
      name: 'test-repo'
    },
    ideation: {
      goals: 'Test project goals',
      targetAudience: 'Developers',
      keyFeatures: 'Testing features',
      technicalRequirements: 'Technical requirements'
    }
  };
  
  // Mock analysis data
  const mockAnalysis = {
    id: 'analysis-123',
    projectId: mockProjectId,
    repositoryStructure: {
      totalFiles: 42,
      languages: {
        JavaScript: 60,
        TypeScript: 30,
        CSS: 10
      }
    },
    codeStructure: {
      components: ['Button', 'Card', 'Form', 'Input', 'Modal']
    },
    recommendations: [
      'Use a component library',
      'Implement form validation',
      'Add unit tests'
    ]
  };
  
  // Mock project structure
  const mockStructure = {
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
        }
      ]
    }
  };
  
  // Mock tasks
  const mockTasks = {
    tasks: [
      {
        _id: 'task-1',
        projectId: mockProjectId,
        name: 'Build project',
        status: 'running',
        progress: 75,
        startTime: new Date().toISOString(),
        command: 'npm run build'
      },
      {
        _id: 'task-2',
        projectId: mockProjectId,
        name: 'Run tests',
        status: 'queued',
        command: 'npm test'
      }
    ]
  };
  
  // Mock project phases
  const mockPhases = {
    phases: [
      {
        name: 'Development Phase',
        status: 'in_progress',
        steps: [
          { id: 1, title: 'Setup Environment', status: 'completed' },
          { id: 2, title: 'Configure Build System', status: 'in_progress' },
          { id: 3, title: 'Create Component Structure', status: 'pending' }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock WebSocket connection
    (useWebSocketModule.useWebSocket as jest.Mock).mockReturnValue({
      socket: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      },
      isConnected: true,
      connectionError: null,
      lastMessage: null
    });
    
    // Mock MongoDB integration via fetch responses
    (global.fetch as jest.Mock).mockImplementation((url) => {
      // Project data
      if (url === `/api/projects/${mockProjectId}`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProject)
        });
      }
      
      // Analysis data
      if (url === `/api/analysis/${mockProjectId}`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAnalysis)
        });
      }
      
      // Project files
      if (url.startsWith(`/api/project-files?projectId=${mockProjectId}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'file-1', path: '/src', filename: 'index.js', language: 'javascript', content: 'console.log("Hello")' },
            { id: 'file-2', path: '/src', filename: 'app.js', language: 'javascript', content: 'const app = {}' }
          ])
        });
      }
      
      // Chat history
      if (url === `/api/chat/history?projectId=${mockProjectId}`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            messages: [
              {
                id: 'msg-1',
                role: 'assistant',
                content: 'Welcome to G.R.I.P. How can I help you with your project?',
                timestamp: new Date().toISOString()
              }
            ]
          })
        });
      }
      
      // Project phases for ProjectContextDisplay
      if (url === `/api/projects/${mockProjectId}/phases`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPhases)
        });
      }
      
      // Tasks for TaskProgressIndicator
      if (url === `/api/projects/${mockProjectId}/tasks?status=active`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks)
        });
      }
      
      // WebSocket health check
      if (url === '/api/ws/health') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'ok' })
        });
      }
      
      // Chat API endpoint
      if (url === '/api/enhanced-chat') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'response-1',
            role: 'assistant',
            content: 'I can help you develop your project. What would you like to work on first?',
            timestamp: new Date().toISOString()
          })
        });
      }
      
      console.warn('Unhandled fetch request:', url);
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  it('loads and displays the complete chat interface with context', async () => {
    render(<ChatSystemTestWrapper projectId={mockProjectId} />);
    
    // Verify that the main chat components are rendered
    await waitFor(() => {
      // Should display the chat welcome message
      expect(screen.getByText('Welcome to G.R.I.P. How can I help you with your project?')).toBeInTheDocument();
    });
    
    // Wait for project context to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Development Phase')).toBeInTheDocument();
    });
    
    // Wait for task progress to load
    await waitFor(() => {
      expect(screen.getByText('Build project')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
    
    // Verify MongoDB API calls
    expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}`);
    expect(global.fetch).toHaveBeenCalledWith(`/api/analysis/${mockProjectId}`);
    expect(global.fetch).toHaveBeenCalledWith(`/api/chat/history?projectId=${mockProjectId}`);
    expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/phases`);
    expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${mockProjectId}/tasks?status=active`);
  });

  it('processes user messages and displays AI responses', async () => {
    render(<ChatSystemTestWrapper projectId={mockProjectId} />);
    
    // Wait for chat interface to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });
    
    // Type a message
    const inputField = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(inputField, { target: { value: 'How do I create a new component?' } });
    
    // Send the message
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);
    
    // Check that the message was sent
    await waitFor(() => {
      expect(screen.getByText('How do I create a new component?')).toBeInTheDocument();
    });
    
    // Verify API call to enhanced-chat endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/enhanced-chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.any(String),
      })
    );
    
    // Check that the response is displayed
    await waitFor(() => {
      expect(screen.getByText('I can help you develop your project. What would you like to work on first?')).toBeInTheDocument();
    });
  });

  it('displays task-specific instructions based on URL parameter', async () => {
    const developWelcomeMessage = "Let's start developing the core features for your project. I'll help you build the main components and implement the key functionality. What feature would you like to work on first?";
    
    render(<ChatSystemTestWrapper projectId={mockProjectId} welcomeMessage={developWelcomeMessage} />);
    
    // Verify that the task-specific welcome message is displayed
    await waitFor(() => {
      expect(screen.getByText(developWelcomeMessage)).toBeInTheDocument();
    });
  });

  it('handles WebSocket status updates for task progress', async () => {
    // Mock the WebSocket to emit a task update
    const mockOn = jest.fn().mockImplementation((event, callback) => {
      if (event === 'taskUpdate') {
        // Schedule a task update event
        setTimeout(() => {
          callback({
            taskId: 'task-1',
            status: 'completed',
            progress: 100,
            projectId: mockProjectId
          });
        }, 100);
      }
    });
    
    const mockSocket = {
      on: mockOn,
      off: jest.fn(),
      emit: jest.fn()
    };
    
    // Setup the WebSocket mock with our custom socket
    (useWebSocketModule.useWebSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      connectionError: null,
      lastMessage: null
    });
    
    render(<ChatSystemTestWrapper projectId={mockProjectId} />);
    
    // Wait for task progress to initially load
    await waitFor(() => {
      expect(screen.getByText('Build project')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
    
    // Mock the API response for the refreshed task list
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === `/api/projects/${mockProjectId}/tasks?status=active`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            tasks: [
              {
                _id: 'task-1',
                projectId: mockProjectId,
                name: 'Build project',
                status: 'completed',
                progress: 100,
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                command: 'npm run build'
              },
              {
                _id: 'task-2',
                projectId: mockProjectId,
                name: 'Run tests',
                status: 'running',
                progress: 10,
                startTime: new Date().toISOString(),
                command: 'npm test'
              }
            ]
          })
        });
      }
      
      // Default response for other API calls
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
    
    // Wait for the task status to update after WebSocket event
    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
    
    // Verify toast notification about task completion
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Task Completed'),
        })
      );
    });
  });

  it('handles errors gracefully when API calls fail', async () => {
    // Mock API failures
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === `/api/projects/${mockProjectId}`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProject)
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' })
      });
    });
    
    render(<ChatSystemTestWrapper projectId={mockProjectId} />);
    
    // Verify that error states are displayed
    await waitFor(() => {
      expect(screen.getByText('Error loading project context')).toBeInTheDocument();
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    });
    
    // Should still render the chat interface even with failed context
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    
    // Try sending a message with failed API
    const inputField = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(inputField, { target: { value: 'Help with my project' } });
    
    // Send the message
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);
    
    // Check that error handling works
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Error'),
          variant: 'destructive',
        })
      );
    });
  });

  it('correctly expands and collapses the project context display', async () => {
    render(<ChatSystemTestWrapper projectId={mockProjectId} />);
    
    // Wait for the project context to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
    
    // Initially only basic info should be visible (collapsed state)
    expect(screen.getByText('Development Phase')).toBeInTheDocument();
    expect(screen.queryByText('Setup Environment')).toBeInTheDocument();
    expect(screen.queryByText('Target Audience')).not.toBeInTheDocument();
    
    // Click to expand context
    const expandButton = screen.getByLabelText('Expand project context');
    fireEvent.click(expandButton);
    
    // Expanded view should show more details
    await waitFor(() => {
      expect(screen.getByText('Target Audience')).toBeInTheDocument();
      expect(screen.getByText('Developers')).toBeInTheDocument();
      expect(screen.getByText('Technical Requirements')).toBeInTheDocument();
      expect(screen.getByText('Technical requirements')).toBeInTheDocument();
    });
    
    // Click to collapse again
    const collapseButton = screen.getByLabelText('Collapse project context');
    fireEvent.click(collapseButton);
    
    // Detailed info should be hidden again
    await waitFor(() => {
      expect(screen.queryByText('Target Audience')).not.toBeInTheDocument();
    });
  });
}); 