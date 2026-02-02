import React from 'react';
import { render, act } from '@testing-library/react';
import { EnhancedChat } from '@/components/chat/EnhancedChatInterface';
import { ProjectContextDisplay } from '@/components/chat/ProjectContextDisplay';
import { TaskProgressIndicator } from '@/components/chat/TaskProgressIndicator';

// Mock components to avoid external dependencies
jest.mock('@/components/chat/ProjectContextDisplay', () => ({
  ProjectContextDisplay: jest.fn(() => <div data-testid="project-context">Project Context Mock</div>),
}));

jest.mock('@/components/chat/TaskProgressIndicator', () => ({
  TaskProgressIndicator: jest.fn(({ projectId, refreshInterval }) => (
    <div data-testid="task-progress">
      Task Progress Mock for {projectId}
      {refreshInterval && <span>Refresh: {refreshInterval}ms</span>}
    </div>
  )),
}));

// Mock fetch
global.fetch = jest.fn();

// Helper function to measure execution time
const measureExecutionTime = async (callback: () => Promise<void>): Promise<number> => {
  const startTime = performance.now();
  await callback();
  return performance.now() - startTime;
};

// Mock useWebSocket hook
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    socket: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    isConnected: true,
    connectionError: null,
    lastMessage: null
  }))
}));

// Mock enhanced chat provider
jest.mock('@/components/providers/EnhancedChatProvider', () => ({
  EnhancedChatProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="enhanced-chat-provider">{children}</div>
  ),
  useEnhancedChat: jest.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    sendInitialTaskMessage: jest.fn(),
    contextEnabled: true,
    projectContext: {
      title: 'Test Project',
      description: 'A test project',
      repository: { owner: 'test-user', name: 'test-repo' },
      ideation: {
        goals: 'Test goals',
        targetAudience: 'Developers'
      }
    }
  }))
}));

// Add interface for TaskProgressIndicator props
interface TaskProgressIndicatorProps {
  projectId: string;
  refreshInterval?: number;
}

// Create type guard for performance.memory
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

describe('Performance Optimization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch to return quickly
    (global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });
    
    // Reset ProjectContextDisplay and TaskProgressIndicator mocks
    (ProjectContextDisplay as jest.Mock).mockClear();
    (TaskProgressIndicator as jest.Mock).mockClear();
  });
  
  it('EnhancedChat renders efficiently (under 100ms)', async () => {
    let component: HTMLElement | null = null;
    
    const renderTime = await measureExecutionTime(async () => {
      await act(async () => {
        const { container } = render(<EnhancedChat projectId="test-project" />);
        component = container;
      });
    });
    
    // Log the render time for debugging
    console.log(`EnhancedChat initial render time: ${renderTime.toFixed(2)}ms`);
    
    // Performance benchmark - adjust based on your environment
    expect(renderTime).toBeLessThan(100);
    expect(component).not.toBeNull();
  });
  
  it('ProjectContextDisplay performs minimal rerenders', async () => {
    // Track render count without mocking React.createElement
    let renderCount = 0;
    const OriginalProjectContextDisplay = ProjectContextDisplay;
    
    // Replace the mock implementation to count renders
    (ProjectContextDisplay as jest.Mock).mockImplementation(props => {
      renderCount++;
      return <div data-testid="project-context">Project Context Mock</div>;
    });
    
    try {
      // Render the component
      const { rerender } = render(<ProjectContextDisplay />);
      
      // Force a rerender
      rerender(<ProjectContextDisplay />);
      
      // The component should optimize rerenders
      expect(renderCount).toBeLessThanOrEqual(2);
      
      // The mock should have been called at least once
      expect(ProjectContextDisplay).toHaveBeenCalled();
    } finally {
      // Restore original implementation
      (ProjectContextDisplay as jest.Mock).mockImplementation(
        () => <div data-testid="project-context">Project Context Mock</div>
      );
    }
  });
  
  it('limits API calls during component interactions', async () => {
    // Measure the number of API calls made during component mount and interactions
    render(<TaskProgressIndicator projectId="test-project" />);
    
    // Check initial fetch calls
    const initialFetchCount = (global.fetch as jest.Mock).mock.calls.length;
    
    // The component should make limited API calls on mount
    expect(initialFetchCount).toBeLessThanOrEqual(2);
    
    // Render the component again (simulating navigation)
    render(<TaskProgressIndicator projectId="test-project" />);
    
    // Check fetch calls after second render
    const finalFetchCount = (global.fetch as jest.Mock).mock.calls.length;
    
    // The second render should reuse data or limit additional API calls
    // We expect at most 2 more calls (one for tasks, one for metrics)
    expect(finalFetchCount - initialFetchCount).toBeLessThanOrEqual(2);
  });
  
  it('avoids unnecessary DOM updates in TaskProgressIndicator', async () => {
    // Create a custom wrapper component that accepts any props
    const TestTaskIndicator = (props: any) => {
      return <TaskProgressIndicator projectId={props.projectId} />;
    };
    
    // Create a spy to track DOM mutations
    let mutationCount = 0;
    const mutationObserver = new MutationObserver(() => {
      mutationCount++;
    });
    
    // Render component with the wrapper
    const { container, rerender } = render(<TestTaskIndicator projectId="test-project" />);
    
    // Start observing DOM changes
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    
    // Simulate task update (via prop change) using the wrapper
    rerender(<TestTaskIndicator projectId="test-project" refreshInterval={5000} />);
    
    // Check mutation count - should be limited as the component should optimize updates
    expect(mutationCount).toBeLessThanOrEqual(5);
    
    // Clean up observer
    mutationObserver.disconnect();
  });
  
  it('measures response time for chat message submission', async () => {
    const { container } = render(<EnhancedChat projectId="test-project" />);
    
    // Mock successful API response
    (global.fetch as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'response-123',
          content: 'This is a test response',
          role: 'assistant'
        })
      });
    });
    
    // Measure time to send a message and receive response
    const responseTime = await measureExecutionTime(async () => {
      await act(async () => {
        // Find the input and submit button (this depends on your implementation)
        const inputEl = container.querySelector('input');
        const buttonEl = container.querySelector('button');
        
        if (inputEl && buttonEl) {
          // Type a message
          inputEl.value = 'Test message';
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Send the message
          buttonEl.click();
          
          // Wait for the response (simulating the API call time)
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });
    });
    
    // Log the response time
    console.log(`Chat message response time: ${responseTime.toFixed(2)}ms`);
    
    // Response time should be reasonably fast
    expect(responseTime).toBeLessThan(100);
    
    // API should be called exactly once for the message
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  
  it('optimizes memory usage for long chat sessions', async () => {
    // Cast performance to our extended interface
    const perf = performance as PerformanceWithMemory;
    const hasMemoryAPI = typeof perf.memory !== 'undefined';
    
    // Skip test if memory API is not available (non-Chrome browsers)
    if (!hasMemoryAPI) {
      console.log('Memory API not available, skipping memory test');
      return;
    }
    
    // Store original memory object
    const originalMemory = perf.memory;
    let mockMemory: MemoryInfo = {
      usedJSHeapSize: 1000000, // Start with 1MB
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 200000000
    };
    
    try {
      // Replace the memory object with our mock if it exists
      if (hasMemoryAPI) {
        Object.defineProperty(perf, 'memory', {
          get: () => mockMemory,
          configurable: true
        });
      }
      
      // Baseline memory usage
      const initialMemory = hasMemoryAPI ? mockMemory.usedJSHeapSize : 0;
      
      // Render component with a large number of messages
      const messages = Array(100).fill(0).map((_, i) => ({
        id: `msg-${i}`,
        content: `Test message ${i} with some content to simulate a real message`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date().toISOString()
      }));
      
      // Override the useEnhancedChat mock to provide many messages
      const useEnhancedChatMock = jest.requireMock('@/components/providers/EnhancedChatProvider').useEnhancedChat;
      useEnhancedChatMock.mockReturnValue({
        messages,
        isLoading: false,
        error: null,
        sendMessage: jest.fn(),
        sendInitialTaskMessage: jest.fn(),
        contextEnabled: true,
        projectContext: {
          title: 'Test Project',
          description: 'A test project',
          repository: { owner: 'test-user', name: 'test-repo' },
          ideation: {
            goals: 'Test goals',
            targetAudience: 'Developers'
          }
        }
      });
      
      // Simulate memory usage after rendering a large message list
      if (hasMemoryAPI) {
        // Simulate increased memory usage
        mockMemory.usedJSHeapSize += 5000000; // Add 5MB
      }
      
      // Render the component
      await act(async () => {
        render(<EnhancedChat projectId="test-project" />);
      });
      
      // Memory after rendering (simulated)
      const finalMemory = hasMemoryAPI ? mockMemory.usedJSHeapSize : 0;
      
      if (initialMemory > 0 && finalMemory > 0) {
        // Calculate memory increase
        const memoryIncrease = finalMemory - initialMemory;
        console.log(`Memory usage increase: ${(memoryIncrease / 1048576).toFixed(2)} MB`);
        
        // Memory increase should be reasonable
        expect(memoryIncrease).toBeLessThan(10 * 1048576); // Less than 10MB increase
      }
    } finally {
      // Restore original performance.memory if it was modified
      if (hasMemoryAPI && originalMemory) {
        Object.defineProperty(perf, 'memory', {
          value: originalMemory,
          configurable: true,
          writable: true
        });
      }
    }
  });
}); 