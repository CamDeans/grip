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

describe.skip('EnhancedChat Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockUseEnhancedChat);
  });

  // Message Processing Performance Test
  it('maintains performance with rapid message processing', async () => {
    const mockSendMessage = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
      return { success: true };
    });

    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    // Send multiple messages rapidly
    const startTime = performance.now();
    for (let i = 0; i < 10; i++) {
      fireEvent.change(input, { target: { value: `Test message ${i}` } });
      fireEvent.click(sendButton);
    }

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(10);
    });

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Verify performance meets requirements (messages processed within 1 second)
    expect(totalTime).toBeLessThan(1000);
  });

  // Context Loading Performance Test
  it('maintains performance during context loading', async () => {
    const mockRefreshContext = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate context loading delay
      return { success: true };
    });

    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      refreshContext: mockRefreshContext
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const contextToggle = screen.getByText(/Toggle Context/i);
    const startTime = performance.now();

    fireEvent.click(contextToggle);

    await waitFor(() => {
      expect(mockRefreshContext).toHaveBeenCalled();
    });

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Verify context loading performance meets requirements (loaded within 200ms)
    expect(totalTime).toBeLessThan(200);
  });

  // Memory Usage Performance Test
  it('maintains stable memory usage during extended chat sessions', async () => {
    const mockMessages = Array(100).fill(null).map((_, i) => ({
      id: `msg-${i}`,
      content: `Test message ${i}`,
      timestamp: Date.now() + i
    }));

    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      messages: mockMessages
    });

    const { unmount } = render(<EnhancedChat projectId="test-project-id" />);
    
    // Record initial memory usage
    const initialMemory = process.memoryUsage().heapUsed;

    // Simulate chat activity
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    for (let i = 0; i < 50; i++) {
      fireEvent.change(input, { target: { value: `Test message ${i}` } });
      fireEvent.click(sendButton);
    }

    // Record final memory usage
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Verify memory usage is within acceptable limits (less than 50MB increase)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

    // Cleanup
    unmount();
  });

  // WebSocket Performance Test
  it('maintains WebSocket connection performance under load', async () => {
    const mockWebSocket = new WebSocket('ws://test.com');
    const mockOnMessage = jest.fn();
    mockWebSocket.on('message', mockOnMessage);

    render(<EnhancedChat projectId="test-project-id" />);
    
    // Simulate rapid WebSocket messages
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      act(() => {
        mockWebSocket.send(JSON.stringify({ type: 'message', content: `Test message ${i}` }));
      });
    }

    await waitFor(() => {
      expect(mockOnMessage).toHaveBeenCalledTimes(100);
    });

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Verify WebSocket performance meets requirements (messages processed within 500ms)
    expect(totalTime).toBeLessThan(500);
  });

  // UI Rendering Performance Test
  it('maintains UI rendering performance with large message history', async () => {
    const mockMessages = Array(1000).fill(null).map((_, i) => ({
      id: `msg-${i}`,
      content: `Test message ${i}`,
      timestamp: Date.now() + i
    }));

    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      messages: mockMessages
    });

    const startTime = performance.now();
    render(<EnhancedChat projectId="test-project-id" />);
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Verify UI rendering performance meets requirements (rendered within 1 second)
    expect(renderTime).toBeLessThan(1000);
  });

  // Error Recovery Performance Test
  it('maintains performance during error recovery', async () => {
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

    const startTime = performance.now();
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(3);
    });

    const endTime = performance.now();
    const recoveryTime = endTime - startTime;

    // Verify error recovery performance meets requirements (recovered within 2 seconds)
    expect(recoveryTime).toBeLessThan(2000);
  });

  // Rate Limiting Performance Test
  it('maintains performance with rate limiting enabled', async () => {
    const mockSendMessage = jest.fn();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      sendMessage: mockSendMessage
    });

    render(<EnhancedChat projectId="test-project-id" />);
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    const startTime = performance.now();
    for (let i = 0; i < 20; i++) {
      fireEvent.change(input, { target: { value: `Test message ${i}` } });
      fireEvent.click(sendButton);
    }

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(5); // Rate limit should be 5 messages
    });

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Verify rate limiting performance meets requirements (processed within 500ms)
    expect(processingTime).toBeLessThan(500);
  });
}); 