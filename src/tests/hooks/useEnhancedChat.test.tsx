import React from 'react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useEnhancedChat } from '@/hooks/useEnhancedChat';
import * as contextModule from '@/components/providers/EnhancedChatProvider';

// Mock the context hook from the provider
jest.mock('@/components/providers/EnhancedChatProvider', () => ({
  useEnhancedChat: jest.fn()
}));

describe('useEnhancedChat', () => {
  const mockContextData = {
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    resetChat: jest.fn(),
    projectContext: {
      id: 'test-project-id',
      title: 'Test Project',
      description: 'This is a test project'
    },
    analysisContext: {
      id: 'test-analysis-id',
      projectId: 'test-project-id',
      recommendations: ['Recommendation 1']
    },
    fileContext: [
      {
        id: 'file-1',
        path: '/src/file1.tsx',
        filename: 'file1.tsx',
        language: 'typescript',
        content: 'const test = true;',
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
        output: 'Build successful'
      }
    ],
    contextEnabled: true,
    toggleContext: jest.fn(),
    loadingContext: false,
    refreshContext: jest.fn(() => Promise.resolve()),
    clearContext: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (contextModule.useEnhancedChat as jest.Mock).mockReturnValue(mockContextData);
  });

  it('returns the base context from provider', () => {
    const { result } = renderHook(() => useEnhancedChat());
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.projectContext).toEqual(mockContextData.projectContext);
    expect(result.current.analysisContext).toEqual(mockContextData.analysisContext);
    expect(result.current.fileContext).toEqual(mockContextData.fileContext);
    expect(result.current.structureContext).toEqual(mockContextData.structureContext);
    expect(result.current.buildContext).toEqual(mockContextData.buildContext);
    expect(result.current.contextEnabled).toBe(true);
    expect(result.current.loadingContext).toBe(false);
  });

  it('provides a getContextSummary helper function', () => {
    const { result } = renderHook(() => useEnhancedChat());
    
    expect(result.current.getContextSummary).toBeDefined();
    
    const summary = result.current.getContextSummary();
    expect(summary.projectAvailable).toBe(true);
    expect(summary.projectName).toBe('Test Project');
    expect(summary.analysisAvailable).toBe(true);
    expect(summary.filesAvailable).toBe(true);
    expect(summary.fileCount).toBe(1);
    expect(summary.structureAvailable).toBe(true);
    expect(summary.buildsAvailable).toBe(true);
    expect(summary.buildCount).toBe(1);
  });

  it('handles empty context in getContextSummary', () => {
    // Mock with empty context
    (contextModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockContextData,
      projectContext: null,
      analysisContext: null,
      fileContext: [],
      structureContext: null,
      buildContext: []
    });
    
    const { result } = renderHook(() => useEnhancedChat());
    
    const summary = result.current.getContextSummary();
    expect(summary.projectAvailable).toBe(false);
    expect(summary.projectName).toBe('N/A');
    expect(summary.analysisAvailable).toBe(false);
    expect(summary.filesAvailable).toBe(false);
    expect(summary.fileCount).toBe(0);
    expect(summary.structureAvailable).toBe(false);
    expect(summary.buildsAvailable).toBe(false);
    expect(summary.buildCount).toBe(0);
  });

  it('provides sendMessageWithContext function that refreshes context when needed', async () => {
    const { result } = renderHook(() => useEnhancedChat());
    
    await act(async () => {
      await result.current.sendMessageWithContext('Test message', {
        requiresProject: true,
        requiresAnalysis: true
      });
    });
    
    // Since context is already available, it should just call sendMessage
    expect(mockContextData.refreshContext).not.toHaveBeenCalled();
    expect(mockContextData.sendMessage).toHaveBeenCalledWith('Test message');
  });

  it('refreshes context when required context is missing', async () => {
    // Mock with missing context
    (contextModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockContextData,
      projectContext: null
    });
    
    const { result } = renderHook(() => useEnhancedChat());
    
    await act(async () => {
      await result.current.sendMessageWithContext('Test message', {
        requiresProject: true
      });
    });
    
    // Should refresh context since projectContext is null
    expect(mockContextData.refreshContext).toHaveBeenCalled();
    expect(mockContextData.sendMessage).toHaveBeenCalledWith('Test message');
  });

  it('respects contextEnabled flag when sending messages', async () => {
    // Mock with disabled context
    (contextModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockContextData,
      contextEnabled: false
    });
    
    const { result } = renderHook(() => useEnhancedChat());
    
    await act(async () => {
      await result.current.sendMessageWithContext('Test message', {
        requiresProject: true
      });
    });
    
    // Should not refresh context when context is disabled
    expect(mockContextData.refreshContext).not.toHaveBeenCalled();
    expect(mockContextData.sendMessage).toHaveBeenCalledWith('Test message');
  });
}); 