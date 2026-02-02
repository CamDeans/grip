import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectContextDisplay } from '@/components/chat/ProjectContextDisplay';
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

// Mock fetch
global.fetch = jest.fn();

describe('ProjectContextDisplay', () => {
  // Default mock implementation
  const mockUseEnhancedChat = {
    projectContext: {
      id: 'test-project-id',
      title: 'Test Project',
      description: 'This is a test project',
      repository: {
        owner: 'test-user',
        name: 'test-repo'
      },
      ideation: {
        goals: 'Build an amazing app',
        targetAudience: 'Developers',
        keyFeatures: 'AI, Automation',
        technicalRequirements: 'React, Next.js'
      }
    },
    analysisContext: {
      repositoryStructure: {
        totalFiles: 42,
        languages: {
          JavaScript: 60,
          TypeScript: 30,
          CSS: 10
        }
      },
      codeStructure: {
        components: ['Button', 'Card', 'Input', 'Modal', 'Form']
      }
    },
    contextEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue(mockUseEnhancedChat);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        phases: [
          {
            name: 'Development Phase',
            status: 'in_progress',
            steps: [
              { id: 1, title: 'Setup Environment', status: 'completed' },
              { id: 2, title: 'Configure Build System', status: 'in_progress' },
              { id: 3, title: 'Create Component Structure', status: 'pending' },
              { id: 4, title: 'Implement API Integration', status: 'pending' },
              { id: 5, title: 'Add Testing', status: 'pending' }
            ]
          }
        ]
      })
    });
  });

  it('renders loading skeleton initially', async () => {
    render(<ProjectContextDisplay />);
    
    // Verify skeleton is rendered
    expect(document.querySelector('.skeleton')).toBeInTheDocument();
    
    // Wait for fetch to complete
    await waitFor(() => {
      expect(document.querySelector('.skeleton')).not.toBeInTheDocument();
    });
  });

  it('renders project title and primary language badge', async () => {
    render(<ProjectContextDisplay />);
    
    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument(); // Primary language
    });
  });

  it('shows expand/collapse functionality', async () => {
    render(<ProjectContextDisplay />);
    
    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Development Phase')).toBeInTheDocument();
    });
    
    // Initially only shows 3 steps (collapsed view)
    expect(screen.getByText('Setup Environment')).toBeInTheDocument();
    expect(screen.getByText('Configure Build System')).toBeInTheDocument();
    expect(screen.getByText('Create Component Structure')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
    expect(screen.queryByText('Implement API Integration')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(screen.getByLabelText('Expand project context'));
    
    // Should now show all steps
    await waitFor(() => {
      expect(screen.getByText('Implement API Integration')).toBeInTheDocument();
      expect(screen.getByText('Add Testing')).toBeInTheDocument();
    });
    
    // Expanded view should also show project details
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('This is a test project')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Build an amazing app')).toBeInTheDocument();
    
    // Project stats should be visible in expanded view
    expect(screen.getByText('42 files')).toBeInTheDocument();
    expect(screen.getByText('5 components')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getByLabelText('Collapse project context'));
    
    // Hidden steps should not be visible again
    await waitFor(() => {
      expect(screen.queryByText('Implement API Integration')).not.toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    // Mock fetch to return an error
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    
    render(<ProjectContextDisplay />);
    
    // Wait for fetch to fail
    await waitFor(() => {
      expect(screen.getByText(/Error loading project context/i)).toBeInTheDocument();
    });
  });

  it('returns null when context is disabled', () => {
    // Update mock to disable context
    (useEnhancedChatModule.useEnhancedChat as jest.Mock).mockReturnValue({
      ...mockUseEnhancedChat,
      contextEnabled: false,
    });
    
    const { container } = render(<ProjectContextDisplay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays "Setup" phase when no phase is returned from API', async () => {
    // Mock fetch to return empty phases
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        phases: []
      })
    });
    
    render(<ProjectContextDisplay />);
    
    // Wait for fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Setup')).toBeInTheDocument();
    });
  });
}); 