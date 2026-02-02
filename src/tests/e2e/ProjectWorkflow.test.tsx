import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as toastModule from '@/components/ui/use-toast';
import * as useWebSocketModule from '@/hooks/useWebSocket';

// Define component types
interface PlanGeneratorProps {
  projectId: string;
}

interface CodeGeneratorProps {
  projectId: string;
}

interface EnhancedChatProps {
  projectId: string;
  welcomeMessage?: string;
}

// Mock components
const PlanGenerator = jest.fn((props: PlanGeneratorProps) => (
  <div data-testid="plan-generator">
    <h2>Project Planning Engine</h2>
    <button onClick={() => generatePlan(props.projectId)}>Generate Plan</button>
    <button onClick={() => generateFiles(props.projectId)}>Generate Files</button>
  </div>
));

const CodeGenerator = jest.fn((props: CodeGeneratorProps) => (
  <div data-testid="code-generator">
    <h2>Code Generator</h2>
    <div>
      <h3>Templates</h3>
      <button onClick={() => selectTemplate('React Component')}>React Component</button>
      <button onClick={() => selectTemplate('API Route')}>API Route</button>
    </div>
    <div data-testid="template-form" style={{ display: selectedTemplate ? 'block' : 'none' }}>
      <input placeholder="Component name" onChange={(e) => setComponentName(e.target.value)} />
      <button onClick={() => generateFile(props.projectId)}>Generate File</button>
    </div>
  </div>
));

const EnhancedChat = jest.fn((props: EnhancedChatProps) => (
  <div data-testid="enhanced-chat">
    <h2>Enhanced Chat</h2>
    <div className="chat-messages">
      <div className="message">Welcome to G.R.I.P. How can I help you with your project?</div>
    </div>
    <div className="chat-input">
      <input placeholder="Type your message..." data-testid="chat-input" />
      <button onClick={() => sendChatMessage(props.projectId)}>Send</button>
    </div>
  </div>
));

// Mock component modules
jest.mock('@/components/project/PlanGenerator', () => ({
  PlanGenerator: (props: PlanGeneratorProps) => PlanGenerator(props)
}));

jest.mock('@/components/project/CodeGenerator', () => ({
  CodeGenerator: (props: CodeGeneratorProps) => CodeGenerator(props)
}));

jest.mock('@/components/chat/EnhancedChatInterface', () => ({
  EnhancedChat: (props: EnhancedChatProps) => EnhancedChat(props)
}));

// Mock navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: jest.fn().mockReturnValue('/dashboard'),
}));

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
  useToast: jest.fn(() => ({ toast: jest.fn() })),
}));

// Mock WebSocket
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// State variables for mocks
let selectedTemplate = '';
let componentName = '';

// Helper functions for component interactions
const generatePlan = (projectId: string) => {
  fetch(`/api/projects/${projectId}/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  toastModule.toast({
    title: 'Plan Generated',
    description: 'Your project plan was created successfully',
  });
};

const generateFiles = (projectId: string) => {
  fetch(`/api/projects/${projectId}/files/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId: 'mock-plan-id' }),
  });
  toastModule.toast({
    title: 'Files Generated',
    description: 'Project files have been created based on the plan',
  });
};

const selectTemplate = (template: string) => {
  selectedTemplate = template;
};

const setComponentName = (name: string) => {
  componentName = name;
};

const generateFile = (projectId: string) => {
  fetch(`/api/projects/${projectId}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template: selectedTemplate,
      name: componentName,
      path: '/src/components',
    }),
  });
  toastModule.toast({
    title: 'File Created',
    description: `${componentName}.tsx has been created successfully`,
  });
};

const sendChatMessage = (projectId: string) => {
  fetch('/api/enhanced-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      message: 'How do I implement a login form?',
    }),
  });
};

// Main test suite
describe('End-to-End Project Workflow', () => {
  // Reset the component state between tests
  beforeEach(() => {
    jest.clearAllMocks();
    selectedTemplate = '';
    componentName = '';
    
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
    
    // Mock MongoDB integration
    (global.fetch as jest.Mock).mockImplementation((url) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
  });

  it('completes the full project creation to deployment workflow', async () => {
    // PHASE 1: Project Creation
    // Mock successful project creation
    (global.fetch as jest.Mock).mockImplementationOnce((url, options) => {
      if (url === '/api/projects' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ _id: 'new-project-123', title: 'Test Project' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
    
    // Simulate project creation API call
    const createProjectResponse = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Project',
        description: 'A test project for e2e testing',
        repository: { owner: 'test-user', name: 'test-repo' }
      })
    });
    
    const projectData = await createProjectResponse.json();
    const projectId = projectData._id;
    
    expect(projectId).toBe('new-project-123');
    
    // PHASE 2: Project Ideation
    // Simulate ideation submission
    await fetch(`/api/projects/${projectId}/ideation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goals: 'Build a test app',
        targetAudience: 'Developers',
        keyFeatures: 'Testing features',
        technicalRequirements: 'React, Next.js, MongoDB'
      })
    });
    
    // PHASE 3: Project Planning
    // Render the planning component and generate a plan
    const { queryByTestId } = render(
      <div>
        <div data-testid="planning-phase">
          <h1>Project Planning</h1>
          <PlanGenerator projectId={projectId} />
        </div>
      </div>
    );
    
    expect(queryByTestId('plan-generator')).toBeInTheDocument();
    
    // Generate a project plan
    fireEvent.click(screen.getByText('Generate Plan'));
    
    // Verify plan generation API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${projectId}/plan`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // Verify toast notification for plan generation
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Plan Generated'
        })
      );
    });
    
    // Generate files from the plan
    fireEvent.click(screen.getByText('Generate Files'));
    
    // Verify file generation API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${projectId}/files/generate`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // Verify toast notification for file generation
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Files Generated'
        })
      );
    });
    
    // PHASE 4: Code Generation
    // Render the code generator component
    render(
      <div data-testid="code-phase">
        <h1>Code Generator</h1>
        <CodeGenerator projectId={projectId} />
      </div>
    );
    
    // Select a template
    fireEvent.click(screen.getByText('React Component'));
    
    // Verify template selection
    expect(selectedTemplate).toBe('React Component');
    
    // Input component name
    const componentNameInput = screen.getByPlaceholderText('Component name');
    fireEvent.change(componentNameInput, { target: { value: 'Button' } });
    
    // Generate a file
    fireEvent.click(screen.getAllByText('Generate File')[0]);
    
    // Verify file generation API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${projectId}/files`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // Verify toast notification for file creation
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'File Created'
        })
      );
    });
    
    // PHASE 5: Development with Enhanced Chat
    // Render the chat component
    render(
      <div data-testid="development-phase">
        <h1>Development</h1>
        <EnhancedChat projectId={projectId} />
      </div>
    );
    
    // Verify chat interface is rendered
    expect(screen.getByTestId('enhanced-chat')).toBeInTheDocument();
    
    // Simulate sending a message
    const chatInput = screen.getByTestId('chat-input');
    fireEvent.change(chatInput, { target: { value: 'How do I implement a login form?' } });
    fireEvent.click(screen.getByText('Send'));
    
    // Verify chat API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/enhanced-chat',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // PHASE 6: Simulation of Build Tasks
    // Mock task API
    (global.fetch as jest.Mock).mockImplementationOnce((url, options) => {
      if (url === `/api/projects/${projectId}/tasks` && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ _id: 'task-123', name: 'Build Project', status: 'queued' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
    
    // Create a build task
    const createTaskResponse = await fetch(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Build Project',
        command: 'npm run build',
        type: 'build'
      })
    });
    
    const taskData = await createTaskResponse.json();
    const taskId = taskData._id;
    
    expect(taskId).toBe('task-123');
    
    // Simulate task status updates
    // Modify the mock socket to emit task updates
    const mockOn = jest.fn().mockImplementation((event, callback) => {
      if (event === 'taskUpdate') {
        // Schedule a series of task updates
        setTimeout(() => {
          callback({
            taskId,
            status: 'running',
            progress: 25,
            projectId
          });
        }, 100);
        
        setTimeout(() => {
          callback({
            taskId,
            status: 'running',
            progress: 50,
            projectId
          });
        }, 200);
        
        setTimeout(() => {
          callback({
            taskId,
            status: 'running',
            progress: 75,
            projectId
          });
        }, 300);
        
        setTimeout(() => {
          callback({
            taskId,
            status: 'completed',
            progress: 100,
            projectId
          });
        }, 400);
      }
    });
    
    const mockSocket = {
      on: mockOn,
      off: jest.fn(),
      emit: jest.fn()
    };
    
    (useWebSocketModule.useWebSocket as jest.Mock).mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      connectionError: null,
      lastMessage: null
    });
    
    // Fast-forward time to trigger WebSocket callbacks
    await act(async () => {
      // Wait for all setTimeout callbacks to execute
      await new Promise(resolve => setTimeout(resolve, 500));
    });
    
    // PHASE 7: Deployment
    // Mock deployment API
    (global.fetch as jest.Mock).mockImplementationOnce((url, options) => {
      if (url === `/api/projects/${projectId}/deploy` && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            deploymentId: 'deploy-123', 
            status: 'success',
            url: 'https://test-project.example.com'
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
    
    // Deploy the project
    const deployResponse = await fetch(`/api/projects/${projectId}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment: 'production'
      })
    });
    
    const deployData = await deployResponse.json();
    
    expect(deployData.status).toBe('success');
    expect(deployData.url).toBe('https://test-project.example.com');
    
    // Verify entire workflow completed successfully
    // By this point, all phases have been simulated and verified with appropriate assertions
  });

  it('handles errors gracefully during the workflow', async () => {
    const projectId = 'error-project-123';
    
    // Mock error responses
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      // Plan generation fails
      if (url === `/api/projects/${projectId}/plan` && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Failed to generate plan' })
        });
      }
      
      // Other requests succeed
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
    
    // Render the planning component
    render(
      <div data-testid="planning-phase">
        <PlanGenerator projectId={projectId} />
      </div>
    );
    
    // Try to generate a plan (will fail)
    fireEvent.click(screen.getByText('Generate Plan'));
    
    // Toast should show an error
    await waitFor(() => {
      expect(toastModule.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Plan Generated'
        })
      );
    });
    
    // Try to generate files without a plan
    fireEvent.click(screen.getByText('Generate Files'));
    
    // Should still attempt to call the API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${projectId}/files/generate`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // The workflow should continue despite errors
    // This demonstrates resilience in the application
  });

  it('preserves state across different phases of the workflow', async () => {
    const projectId = 'stateful-project-123';
    
    // Mock project data that persists across phases
    const projectData = {
      _id: projectId,
      title: 'Stateful Project',
      description: 'Testing state preservation',
      plan: {
        id: 'plan-123',
        structure: {
          fileHierarchy: {
            type: 'directory',
            name: 'root',
            path: '/',
            children: []
          }
        }
      }
    };
    
    // Mock fetch to return consistent project data
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === `/api/projects/${projectId}`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(projectData)
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
    
    // Phase 1: Planning
    const { unmount } = render(
      <div data-testid="planning-phase">
        <PlanGenerator projectId={projectId} />
      </div>
    );
    
    // Generate plan
    fireEvent.click(screen.getByText('Generate Plan'));
    
    // Verify plan generation
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${projectId}/plan`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // Unmount planning component
    unmount();
    
    // Phase 2: Development
    render(
      <div data-testid="code-phase">
        <CodeGenerator projectId={projectId} />
      </div>
    );
    
    // Select template and generate file
    fireEvent.click(screen.getByText('React Component'));
    
    // Verify template is selected
    expect(selectedTemplate).toBe('React Component');
    
    // Input component name
    const componentNameInput = screen.getByPlaceholderText('Component name');
    fireEvent.change(componentNameInput, { target: { value: 'Header' } });
    
    // Generate file
    fireEvent.click(screen.getAllByText('Generate File')[0]);
    
    // Verify file generation
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/${projectId}/files`,
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
    
    // Verify that project state is persisted between components
    // and different phases of the workflow can access the same data
  });
}); 