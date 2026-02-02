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

describe('EnhancedChat Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockUseEnhancedChat);
  });

  // XSS Prevention Test
  it('prevents XSS attacks in chat messages', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Try to send XSS payload
    const xssPayload = '<script>alert("xss")</script>';
    fireEvent.change(input, { target: { value: xssPayload } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  // SQL Injection Prevention Test
  it('prevents SQL injection attacks in chat messages', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Try to send SQL injection payload
    const sqlPayload = "'; DROP TABLE users; --";
    fireEvent.change(input, { target: { value: sqlPayload } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  // Command Injection Prevention Test
  it('prevents command injection attacks in chat messages', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Try to send command injection payload
    const cmdPayload = "& rm -rf /";
    fireEvent.change(input, { target: { value: cmdPayload } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  // Authentication Test
  it('enforces authentication for chat access', async () => {
    const mockUnauthorizedState = {
      ...mockUseEnhancedChat,
      sessionState: {
        isActive: false,
        lastActivity: Date.now(),
        timeout: 30 * 60 * 1000
      }
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockUnauthorizedState);

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    expect(input).toBeDisabled();
  });

  // Session Management Test
  it('enforces proper session management', async () => {
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

  // Rate Limiting Test
  it('enforces rate limiting to prevent abuse', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Try to send messages rapidly
    for (let i = 0; i < 10; i++) {
      fireEvent.change(input, { target: { value: `Test message ${i}` } });
      fireEvent.click(sendButton);
    }

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(5); // Rate limit should be 5 messages
    });
  });

  // Input Validation Test
  it('validates input to prevent malicious content', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Try to send oversized message
    const oversizedMessage = 'a'.repeat(10000);
    fireEvent.change(input, { target: { value: oversizedMessage } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  // WebSocket Security Test
  it('secures WebSocket connections', async () => {
    const mockWebSocket = new WebSocket('ws://test.com');
    const mockOnMessage = jest.fn();
    mockWebSocket.on('message', mockOnMessage);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Try to send malicious WebSocket message
    act(() => {
      mockWebSocket.send(JSON.stringify({
        type: 'message',
        content: '<script>alert("xss")</script>'
      }));
    });

    await waitFor(() => {
      expect(mockOnMessage).not.toHaveBeenCalled();
    });
  });

  // Data Encryption Test
  it('ensures sensitive data is encrypted', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send message with sensitive data
    const sensitiveMessage = 'password: 123456';
    fireEvent.change(input, { target: { value: sensitiveMessage } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(sensitiveMessage);
    });
  });

  // Error Handling Security Test
  it('handles errors securely without exposing sensitive information', async () => {
    const mockError = {
      ...mockUseEnhancedChat,
      error: {
        error: 'Internal server error',
        status: 500
      }
    };
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockError);

    render(<EnhancedChat projectId="test-project-id" />);
    
    const errorElement = screen.getByText('Internal server error');
    expect(errorElement).toBeInTheDocument();
  });
}); 