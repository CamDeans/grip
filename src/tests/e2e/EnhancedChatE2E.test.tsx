import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedChat } from '@/components/chat/EnhancedChatInterface';
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider';
import * as useEnhancedChatModule from '@/hooks/useEnhancedChat';
import { WebSocket } from 'ws';

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

describe('EnhancedChat End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockUseEnhancedChat);
  });

  // Complete Chat Flow Test
  it('completes a full chat interaction flow', async () => {
    const mockSendMessage = jest.fn()
      .mockResolvedValueOnce({ success: true, message: 'Hello!' })
      .mockResolvedValueOnce({ success: true, message: 'How can I help you?' })
      .mockResolvedValueOnce({ success: true, message: 'I understand your request.' });
    
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send initial message
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Hello');
    });

    // Send follow-up message
    fireEvent.change(input, { target: { value: 'Can you help me?' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Can you help me?');
    });

    // Send final message
    fireEvent.change(input, { target: { value: 'I need assistance' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('I need assistance');
    });
  });

  // Project Context Integration Test
  it('integrates project context throughout chat interaction', async () => {
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
    const projectTitle = screen.getByText('Test Project');
    expect(projectTitle).toBeInTheDocument();

    // Send message about project
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Tell me about this project' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockProjectContext.sendMessage).toHaveBeenCalledWith('Tell me about this project');
    });
  });

  // Error Recovery Flow Test
  it('recovers from errors and maintains chat functionality', async () => {
    const mockSendMessage = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ success: true, message: 'Recovered!' });
    
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send message that will fail
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Wait for retries and recovery
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(3);
    });

    // Verify chat is still functional
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('New message');
    });
  });

  // Performance Under Load Test
  it('maintains performance under heavy message load', async () => {
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
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send multiple messages rapidly
    for (let i = 0; i < 20; i++) {
      fireEvent.change(input, { target: { value: `Test message ${i}` } });
      fireEvent.click(sendButton);
    }

    await waitFor(() => {
      expect(mockPerformanceState.performanceState.messageProcessingTimes.length).toBeGreaterThan(0);
    });
  });

  // Security Flow Test
  it('maintains security throughout chat interaction', async () => {
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

    // Verify normal messages still work
    fireEvent.change(input, { target: { value: 'Safe message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Safe message');
    });
  });

  // Session Management Flow Test
  it('manages chat sessions correctly throughout interaction', async () => {
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
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send initial message
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    // Simulate session timeout
    act(() => {
      mockSessionState.sessionState.isActive = false;
      mockSessionState.sessionState.lastActivity = Date.now() - 31 * 60 * 1000;
    });

    // Verify chat is disabled
    expect(input).toBeDisabled();

    // Simulate session renewal
    act(() => {
      mockSessionState.sessionState.isActive = true;
      mockSessionState.sessionState.lastActivity = Date.now();
    });

    // Verify chat is re-enabled
    expect(input).not.toBeDisabled();
  });

  // Rate Limiting Flow Test
  it('enforces rate limiting throughout chat interaction', async () => {
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

    // Wait for rate limit reset
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify new messages can be sent
    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('New message');
    });
  });
}); 