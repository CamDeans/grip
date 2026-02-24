import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskProgressIndicator } from '@/components/chat/TaskProgressIndicator';
import * as useWebSocketModule from '@/hooks/useWebSocket';
import * as useToastModule from '@/components/ui/use-toast';

// Mock the WebSocket hook
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn()
}));

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

describe.skip('TaskProgressIndicator', () => {
  // Default mock for the WebSocket hook
  const mockUseWebSocket = {
    socket: {
      on: jest.fn(),
      off: jest.fn()
    },
    isConnected: true,
    connectionError: null
  };

  // Default mock for the toast hook
  const mockToast = {
    toast: jest.fn()
  };

  // Mock task data
  const mockTasks = {
    tasks: [
      {
        _id: 'task-1',
        name: 'Running test task',
        description: 'Test description',
        status: 'running',
        type: 'test',
        priority: 'normal',
        command: 'npm run test',
        startTime: new Date().toISOString()
      },
      {
        _id: 'task-2',
        name: 'Queued build task',
        description: 'Another test description',
        status: 'queued',
        type: 'build',
        priority: 'high',
        command: 'npm run build'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useWebSocketModule.useWebSocket as jest.Mock).mockReturnValue(mockUseWebSocket);
    (useToastModule.useToast as jest.Mock).mockReturnValue(mockToast);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockTasks)
    });
  });

  it('renders loading skeleton initially', async () => {
    render(<TaskProgressIndicator projectId="test-project" />);
    
    // Should show a loading skeleton
    expect(document.querySelector('.skeleton')).toBeInTheDocument();
    
    // Wait for fetch to complete
    await waitFor(() => {
      expect(document.querySelector('.skeleton')).not.toBeInTheDocument();
    });
  });

  it('displays task information correctly', async () => {
    render(<TaskProgressIndicator projectId="test-project" />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Running test task')).toBeInTheDocument();
      expect(screen.getByText('Queued build task')).toBeInTheDocument();
      expect(screen.getByText('npm run test')).toBeInTheDocument();
      expect(screen.getByText('npm run build')).toBeInTheDocument();
    });
    
    // Check status badges
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('queued')).toBeInTheDocument();
    
    // Check statistics
    expect(screen.getByText('1 running')).toBeInTheDocument();
    expect(screen.getByText('1 queued')).toBeInTheDocument();
  });

  it('handles fetch errors gracefully', async () => {
    // Mock fetch to return an error
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<TaskProgressIndicator projectId="test-project" />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    });
  });

  it('shows live badge when websocket is connected', async () => {
    render(<TaskProgressIndicator projectId="test-project" />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  it('shows polling badge when websocket is not connected', async () => {
    // Mock WebSocket as disconnected
    (useWebSocketModule.useWebSocket as jest.Mock).mockReturnValue({
      ...mockUseWebSocket,
      isConnected: false
    });
    
    render(<TaskProgressIndicator projectId="test-project" />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Polling')).toBeInTheDocument();
    });
  });

  it('does not render when there are no tasks', async () => {
    // Mock empty task list
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ tasks: [] })
    });
    
    const { container } = render(<TaskProgressIndicator projectId="test-project" />);
    
    // Wait for data to load
    await waitFor(() => {
      // Container should be empty once loading is complete
      expect(container).toBeEmptyDOMElement();
    });
  });
}); 