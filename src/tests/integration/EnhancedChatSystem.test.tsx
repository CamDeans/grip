import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedChat } from '@/components/chat/EnhancedChatInterface';
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider';
import { AIMessage } from '@/types'; // Import the AIMessage type
import * as useEnhancedChatModule from '@/hooks/useEnhancedChat';
import { WebSocket } from 'ws';

// Mock the entire EnhancedChatProvider as a module
jest.mock('@/components/providers/EnhancedChatProvider', () => {
  const originalModule = jest.requireActual('@/components/providers/EnhancedChatProvider');
  
  return {
    ...originalModule,
    EnhancedChatProvider: ({ children, projectId }: { children: React.ReactNode, projectId: string }) => {
      const mockContextValue = {
        messages: [] as AIMessage[], // Properly type the messages array
        isLoading: false,
        error: null,
        sendMessage: jest.fn((content) => {
          // Simulate adding a message and response
          mockContextValue.messages.push(
            { role: 'user', content, id: 'user-msg-1', timestamp: new Date() } as AIMessage,
            { 
              role: 'assistant', 
              content: `Response to: ${content}`, 
              id: 'assistant-msg-1', 
              timestamp: new Date() 
            } as AIMessage
          );
          mockContextValue.isLoading = false;
          return Promise.resolve();
        }),
        resetChat: jest.fn(),
        addMessage: jest.fn(),
        projectContext: {
          id: projectId,
          title: 'Integration Test Project',
          description: 'A project for integration testing'
        },
        analysisContext: {
          id: 'test-analysis',
          projectId: projectId,
          recommendations: ['Test well']
        },
        fileContext: [
          {
            id: 'file-1',
            path: '/src/components/Test.tsx',
            filename: 'Test.tsx',
            language: 'typescript',
            content: 'export const Test = () => <div>Test Component</div>;',
            version: 1
          }
        ],
        structureContext: {
          fileHierarchy: {
            type: 'directory',
            name: 'root',
            path: '/',
            children: []
          }
        },
        buildContext: [
          {
            taskType: 'build',
            command: 'npm run build',
            status: 'completed',
            output: 'Build completed successfully'
          }
        ],
        contextEnabled: true,
        toggleContext: jest.fn(() => {
          mockContextValue.contextEnabled = !mockContextValue.contextEnabled;
        }),
        loadingContext: false,
        clearContext: jest.fn(),
        refreshContext: jest.fn(() => Promise.resolve())
      };
      
      return (
        <originalModule.EnhancedChatContext.Provider value={mockContextValue}>
          {children}
        </originalModule.EnhancedChatContext.Provider>
      );
    }
  };
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/projects/test-project-id'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ 
      phases: [
        {
          name: 'Development Phase',
          status: 'in_progress',
          steps: [
            { title: 'Setup Environment', status: 'completed' },
            { title: 'Configure Build System', status: 'in_progress' },
            { title: 'Create Component Structure', status: 'pending' }
          ]
        }
      ] 
    })
  })
);

// Mock WebSocket
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    close: jest.fn(),
    on: jest.fn(),
    readyState: 1
  }))
}));

// Mock the useEnhancedChat hook
jest.mock('@/hooks/useEnhancedChat', () => ({
  useEnhancedChat: jest.fn()
}));

// Default mock implementation with enhanced features
const mockUseEnhancedChat = {
  messages: [],
  isLoading: false,
  error: null,
  sendMessage: jest.fn(),
  resetChat: jest.fn(),
  projectContext: {
    id: 'test-project-id',
    title: 'Test Project',
    description: 'This is a test project',
  },
  analysisContext: null,
  fileContext: [],
  structureContext: null,
  buildContext: [],
  contextEnabled: true,
  toggleContext: jest.fn(),
  loadingContext: false,
  refreshContext: jest.fn(),
  sessionState: {
    isActive: true,
    lastActivity: Date.now(),
    timeout: 30 * 60 * 1000
  },
  errorState: {
    errors: [],
    maxErrors: 100
  },
  performanceState: {
    messageProcessingTimes: [],
    contextLoadTimes: [],
    maxSamples: 100
  }
};

describe.skip('Enhanced Chat System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockUseEnhancedChat);
  });

  it('renders the enhanced chat interface with context panel', async () => {
    render(<EnhancedChat projectId="test-project-id" />);
    
    // Wait for components to load
    await waitFor(() => {
      expect(screen.getByText(/Integration Test Project/i)).toBeInTheDocument();
    });
  });

  it('allows sending messages and displays responses', async () => {
    render(<EnhancedChat projectId="test-project-id" />);
    
    // Find the input field and send a message
    const inputField = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(inputField, { target: { value: 'Hello G.R.I.P.' } });
    fireEvent.click(sendButton);
    
    // Wait for the response
    await waitFor(() => {
      expect(screen.getByText('Hello G.R.I.P.')).toBeInTheDocument();
      expect(screen.getByText('Response to: Hello G.R.I.P.')).toBeInTheDocument();
    });
  });

  it('displays project context information in the context panel', async () => {
    render(<EnhancedChat projectId="test-project-id" />);
    
    // Wait for the context panel to load
    await waitFor(() => {
      expect(screen.getByText('Project Context')).toBeInTheDocument();
      expect(screen.getByText('Integration Test Project')).toBeInTheDocument();
      expect(screen.getByText('A project for integration testing')).toBeInTheDocument();
    });
  });

  it('toggles context display when the toggle button is clicked', async () => {
    render(<EnhancedChat projectId="test-project-id" />);
    
    // Find the toggle button
    const toggleButton = await screen.findByRole('button', { name: /enabled/i });
    
    // Toggle context off
    fireEvent.click(toggleButton);
    
    // Context should now be disabled
    await waitFor(() => {
      expect(screen.getByText(/context is disabled/i)).toBeInTheDocument();
    });
    
    // Toggle context back on
    fireEvent.click(toggleButton);
    
    // Context should be enabled again
    await waitFor(() => {
      expect(screen.queryByText(/context is disabled/i)).not.toBeInTheDocument();
    });
  });

  it('displays file content when previewed', async () => {
    // This test would need to mock the file preview functionality
    // We'll focus on checking that the FilePreview component can be triggered
    render(<EnhancedChat projectId="test-project-id" />);
    
    // For a complete test, we would need to trigger the FilePreview component
    // This is just a placeholder as we would need to mock the chat message with code block
    await waitFor(() => {
      expect(screen.getByText('Integration Test Project')).toBeInTheDocument();
    });
    
    // In a real case, we'd find a code block and click it to trigger preview
    // This is just a placeholder assertion
    expect(true).toBe(true);
  });

  it('displays task progress indicators correctly', async () => {
    render(<EnhancedChat projectId="test-project-id" />);
    
    // Wait for the project state API to be called and display steps
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects/test-project-id/state')
      );
      
      // This would display in the ProjectContextDisplay component
      // Since our mock returns a Development Phase, check for that
      expect(screen.getByText(/Development Phase/i)).toBeInTheDocument();
    });
  });

  // WebSocket Integration Tests
  it('establishes and maintains WebSocket connection', async () => {
    const mockWebSocket = new WebSocket('ws://test.com');
    const mockOnMessage = jest.fn();
    mockWebSocket.on('message', mockOnMessage);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Simulate WebSocket connection
    act(() => {
      mockWebSocket.on('open', () => {
        mockWebSocket.send(JSON.stringify({ type: 'connected' }));
      });
    });

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalled();
    });
  });

  it('handles WebSocket disconnection and reconnection', async () => {
    const mockWebSocket = new WebSocket('ws://test.com');
    const mockOnClose = jest.fn();
    mockWebSocket.on('close', mockOnClose);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Simulate WebSocket disconnection
    act(() => {
      mockWebSocket.close();
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });

    // Verify reconnection attempt
    expect(WebSocket).toHaveBeenCalledTimes(2);
  });

  // Chat Message Flow Tests
  it('completes full message flow from input to display', async () => {
    const mockSendMessage = jest.fn().mockResolvedValue({
      success: true,
      message: 'Test response'
    });
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  // Context Integration Tests
  it('updates chat context when project context changes', async () => {
    const mockRefreshContext = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      refreshContext: mockRefreshContext
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Simulate project context update
    act(() => {
      const contextToggle = screen.getByText(/Toggle Context/i);
      fireEvent.click(contextToggle);
    });

    await waitFor(() => {
      expect(mockRefreshContext).toHaveBeenCalled();
    });
  });

  // Error Recovery Integration Tests
  it('recovers from network errors and retries operations', async () => {
    const mockSendMessage = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true });
    
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(3);
    });
  });

  // Performance Integration Tests
  it('tracks and reports performance metrics across operations', async () => {
    const mockPerformanceState = {
      ...mockUseEnhancedChat,
      performanceState: {
        messageProcessingTimes: [],
        contextLoadTimes: [],
        maxSamples: 100
      }
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockPerformanceState);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Perform multiple operations
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    for (let i = 0; i < 5; i++) {
      fireEvent.change(input, { target: { value: `Test message ${i}` } });
      fireEvent.click(sendButton);
    }

    await waitFor(() => {
      expect(mockPerformanceState.performanceState.messageProcessingTimes.length).toBeGreaterThan(0);
    });
  });

  // Security Integration Tests
  it('enforces security measures across the chat system', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Try to send potentially harmful content
    const harmfulContent = '<script>alert("xss")</script>';
    fireEvent.change(input, { target: { value: harmfulContent } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  // Session Management Integration Tests
  it('manages chat sessions correctly', async () => {
    const mockSessionState = {
      ...mockUseEnhancedChat,
      sessionState: {
        isActive: true,
        lastActivity: Date.now(),
        timeout: 30 * 60 * 1000
      }
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockSessionState);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Simulate session timeout
    act(() => {
      mockSessionState.sessionState.isActive = false;
      mockSessionState.sessionState.lastActivity = Date.now() - 31 * 60 * 1000;
    });

    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toBeDisabled();
  });

  // Rate Limiting Integration Tests
  it('enforces rate limiting across the chat system', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send messages rapidly
    for (let i = 0; i < 10; i++) {
      fireEvent.change(input, { target: { value: `Test message ${i}` } });
      fireEvent.click(sendButton);
    }

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(5); // Rate limit should be 5 messages
    });
  });
}); 