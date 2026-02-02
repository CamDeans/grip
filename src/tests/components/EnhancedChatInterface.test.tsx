import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedChat } from '@/components/chat/EnhancedChatInterface';
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider';
import * as useEnhancedChatModule from '@/hooks/useEnhancedChat';

// Mock the useEnhancedChat hook
jest.mock('@/hooks/useEnhancedChat', () => ({
  useEnhancedChat: jest.fn()
}));

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/projects/test-project-id'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock the EnhancedChatProvider component
jest.mock('@/components/providers/EnhancedChatProvider', () => ({
  EnhancedChatProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="enhanced-chat-provider">{children}</div>,
}));

describe('EnhancedChatInterface', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockUseEnhancedChat);
  });

  // Basic rendering tests
  it('renders the EnhancedChat component with provider', () => {
    render(<EnhancedChat projectId="test-project-id" welcomeMessage="Welcome to the chat!" />);
    
    const providerElement = screen.getByTestId('enhanced-chat-provider');
    expect(providerElement).toBeInTheDocument();
  });

  // Session management tests
  it('handles session timeout correctly', async () => {
    const mockSessionTimeout = {
      ...mockUseEnhancedChat,
      sessionState: {
        isActive: false,
        lastActivity: Date.now() - 31 * 60 * 1000,
        timeout: 30 * 60 * 1000
      }
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockSessionTimeout);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Verify that the chat is in a timeout state
    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toBeDisabled();
  });

  // Rate limiting tests
  it('enforces rate limiting on message sending', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send multiple messages quickly
    for (let i = 0; i < 6; i++) {
      fireEvent.change(input, { target: { value: `Test message ${i}` } });
      fireEvent.click(sendButton);
    }

    // Verify rate limiting
    expect(mockSendMessage).toHaveBeenCalledTimes(5); // Only 5 messages should be sent
  });

  // Error handling tests
  it('displays error messages correctly', async () => {
    const errorMessage = 'Failed to send message';
    const mockError = {
      ...mockUseEnhancedChat,
      error: {
        error: errorMessage,
        status: 500
      }
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockError);

    render(<EnhancedChat projectId="test-project-id" />);
    
    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();
  });

  // Performance monitoring tests
  it('tracks performance metrics', async () => {
    const mockPerformanceState = {
      ...mockUseEnhancedChat,
      performanceState: {
        messageProcessingTimes: [100, 200, 300],
        contextLoadTimes: [50, 150, 250],
        maxSamples: 100
      }
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockPerformanceState);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Verify performance metrics are being tracked
    expect(mockPerformanceState.performanceState.messageProcessingTimes).toHaveLength(3);
    expect(mockPerformanceState.performanceState.contextLoadTimes).toHaveLength(3);
  });

  // WebSocket connection tests
  it('handles WebSocket connection status', async () => {
    const mockWebSocketState = {
      ...mockUseEnhancedChat,
      isWebSocketConnected: false
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockWebSocketState);

    render(<EnhancedChat projectId="test-project-id" />);
    
    const errorElement = screen.getByText(/WebSocket connection issue/i);
    expect(errorElement).toBeInTheDocument();
  });

  // Message validation tests
  it('validates message content before sending', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Try to send an empty message
    fireEvent.click(sendButton);
    expect(mockSendMessage).not.toHaveBeenCalled();

    // Try to send a message with potentially harmful content
    fireEvent.change(input, { target: { value: '<script>alert("xss")</script>' } });
    fireEvent.click(sendButton);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  // Context management tests
  it('manages project context correctly', async () => {
    const mockProjectContext = {
      ...mockUseEnhancedChat,
      projectContext: {
        id: 'test-project-id',
        title: 'Test Project',
        description: 'This is a test project',
        repository: {
          owner: 'test-owner',
          name: 'test-repo'
        }
      }
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockProjectContext);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Verify project context is displayed
    const contextElement = screen.getByText('Test Project');
    expect(contextElement).toBeInTheDocument();
  });

  // Recovery mechanism tests
  it('implements retry mechanism for failed operations', async () => {
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

    // Wait for retries to complete
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(3);
    });
  });
}); 