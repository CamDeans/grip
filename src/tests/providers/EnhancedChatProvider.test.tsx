import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedChatProvider, useEnhancedChat } from '@/components/providers/EnhancedChatProvider';

// Mock fetch
global.fetch = jest.fn();

// Create a test component that uses the hook
const TestComponent = () => {
  const { 
    messages, 
    isLoading, 
    projectContext, 
    analysisContext, 
    fileContext, 
    structureContext, 
    buildContext,
    contextEnabled,
    loadingContext
  } = useEnhancedChat();
  
  return (
    <div>
      <div data-testid="messages-length">{messages.length}</div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="project-context">{projectContext ? JSON.stringify(projectContext) : 'null'}</div>
      <div data-testid="analysis-context">{analysisContext ? JSON.stringify(analysisContext) : 'null'}</div>
      <div data-testid="file-context-length">{fileContext.length}</div>
      <div data-testid="structure-context">{structureContext ? 'exists' : 'null'}</div>
      <div data-testid="build-context-length">{buildContext.length}</div>
      <div data-testid="context-enabled">{contextEnabled.toString()}</div>
      <div data-testid="loading-context">{loadingContext.toString()}</div>
    </div>
  );
};

describe('EnhancedChatProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful fetch responses
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/projects/test-project-id')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-project-id',
            title: 'Test Project',
            description: 'A test project'
          })
        });
      }
      if (url.includes('/api/projects/test-project-id/analysis')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-analysis-id',
            projectId: 'test-project-id',
            recommendations: ['Test recommendation']
          })
        });
      }
      if (url.includes('/api/projects/test-project-id/files')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              id: 'test-file-id',
              path: '/src/test.tsx',
              filename: 'test.tsx',
              language: 'typescript',
              content: 'Test content',
              version: 1
            }
          ])
        });
      }
      if (url.includes('/api/projects/test-project-id/structure')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            fileHierarchy: {
              type: 'directory',
              name: 'root',
              path: '/',
              children: []
            }
          })
        });
      }
      if (url.includes('/api/projects/test-project-id/builds')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            {
              taskType: 'build',
              command: 'npm run build',
              status: 'completed',
              output: 'Build successful'
            }
          ])
        });
      }
      if (url.includes('/api/projects/test-project-id/chat')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
  });

  it('provides initial state with empty values', async () => {
    let component: any;
    
    await act(async () => {
      component = render(
        <EnhancedChatProvider projectId="test-project-id">
          <TestComponent />
        </EnhancedChatProvider>
      );
    });
    
    const { getByTestId } = component;
    
    expect(getByTestId('messages-length').textContent).toBe('0');
    expect(getByTestId('loading').textContent).toBe('false');
    expect(getByTestId('context-enabled').textContent).toBe('true');
  });

  it('loads project context on initialization', async () => {
    let component: any;
    
    await act(async () => {
      component = render(
        <EnhancedChatProvider projectId="test-project-id">
          <TestComponent />
        </EnhancedChatProvider>
      );
    });
    
    const { getByTestId } = component;
    
    await waitFor(() => {
      const projectContextJson = JSON.parse(getByTestId('project-context').textContent || 'null');
      expect(projectContextJson).not.toBeNull();
      expect(projectContextJson.id).toBe('test-project-id');
      expect(projectContextJson.title).toBe('Test Project');
    });
  });

  it('loads analysis context on initialization', async () => {
    let component: any;
    
    await act(async () => {
      component = render(
        <EnhancedChatProvider projectId="test-project-id">
          <TestComponent />
        </EnhancedChatProvider>
      );
    });
    
    const { getByTestId } = component;
    
    await waitFor(() => {
      const analysisContextJson = JSON.parse(getByTestId('analysis-context').textContent || 'null');
      expect(analysisContextJson).not.toBeNull();
      expect(analysisContextJson.id).toBe('test-analysis-id');
      expect(analysisContextJson.projectId).toBe('test-project-id');
    });
  });

  it('loads file context on initialization', async () => {
    let component: any;
    
    await act(async () => {
      component = render(
        <EnhancedChatProvider projectId="test-project-id">
          <TestComponent />
        </EnhancedChatProvider>
      );
    });
    
    const { getByTestId } = component;
    
    await waitFor(() => {
      expect(getByTestId('file-context-length').textContent).toBe('1');
    });
  });

  it('loads structure context on initialization', async () => {
    let component: any;
    
    await act(async () => {
      component = render(
        <EnhancedChatProvider projectId="test-project-id">
          <TestComponent />
        </EnhancedChatProvider>
      );
    });
    
    const { getByTestId } = component;
    
    await waitFor(() => {
      expect(getByTestId('structure-context').textContent).toBe('exists');
    });
  });

  it('loads build context on initialization', async () => {
    let component: any;
    
    await act(async () => {
      component = render(
        <EnhancedChatProvider projectId="test-project-id">
          <TestComponent />
        </EnhancedChatProvider>
      );
    });
    
    const { getByTestId } = component;
    
    await waitFor(() => {
      expect(getByTestId('build-context-length').textContent).toBe('1');
    });
  });

  it('handles fetch errors gracefully', async () => {
    // Override the fetch mock to simulate errors
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch error'));
    
    let component: any;
    
    await act(async () => {
      component = render(
        <EnhancedChatProvider projectId="test-project-id">
          <TestComponent />
        </EnhancedChatProvider>
      );
    });
    
    const { getByTestId } = component;
    
    // Even with errors, the component should not crash
    expect(getByTestId('messages-length')).toBeInTheDocument();
    
    // After errors, context should remain null or empty
    await waitFor(() => {
      expect(getByTestId('project-context').textContent).toBe('null');
      expect(getByTestId('file-context-length').textContent).toBe('0');
    });
  });
}); 