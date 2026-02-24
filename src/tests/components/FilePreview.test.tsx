import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilePreview } from '@/components/chat/FilePreview';

// Mock the copy to clipboard functionality
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

// Mock the URL.createObjectURL
global.URL.createObjectURL = jest.fn();

// Mock fetch for file content loading
global.fetch = jest.fn();

describe.skip('FilePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with provided content', () => {
    render(
      <FilePreview 
        filename="test.tsx"
        path="/src/components/test.tsx"
        language="typescript"
        content="const test = () => <div>Test</div>;"
      />
    );
    
    expect(screen.getByText('test.tsx')).toBeInTheDocument();
    expect(screen.getByText('/src/components/test.tsx')).toBeInTheDocument();
    expect(screen.getByText('const test = () => <div>Test</div>;')).toBeInTheDocument();
  });

  it('renders with default values when minimal props are provided', () => {
    render(<FilePreview content="// Empty file" />);
    
    // Default filename should be empty string
    expect(screen.getByText(/typescript/i)).toBeInTheDocument(); // Default language
    expect(screen.getByText('// Empty file')).toBeInTheDocument();
  });

  it('handles copying content to clipboard', async () => {
    render(
      <FilePreview 
        filename="test.tsx"
        content="const test = () => <div>Test</div>;"
      />
    );
    
    // Find and click the copy button
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    // Check that clipboard.writeText was called with the correct content
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const test = () => <div>Test</div>;');
    
    // Copy success indicator should appear
    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeInTheDocument();
    });
  });

  it('handles expanding and minimizing the preview', () => {
    render(
      <FilePreview 
        filename="test.tsx"
        content="const test = () => <div>Test</div>;"
      />
    );
    
    // Find and click the expand button
    const expandButton = screen.getByRole('button', { name: /maximize/i });
    fireEvent.click(expandButton);
    
    // The preview should now have a class indicating it's expanded
    const previewContainer = screen.getByTestId('file-preview-container');
    expect(previewContainer).toHaveClass('expanded');
    
    // Find and click the minimize button
    const minimizeButton = screen.getByRole('button', { name: /minimize/i });
    fireEvent.click(minimizeButton);
    
    // The preview should no longer have the expanded class
    expect(previewContainer).not.toHaveClass('expanded');
  });

  it('fetches file content when only fileId and projectId are provided', async () => {
    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: 'const fetchedContent = true;',
        language: 'javascript'
      })
    });

    render(
      <FilePreview 
        fileId="file-123"
        projectId="project-456"
      />
    );
    
    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // After fetch completes, should show the fetched content
    await waitFor(() => {
      expect(screen.getByText('const fetchedContent = true;')).toBeInTheDocument();
    });
    
    // Should have called fetch with the correct endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/project-456/files/file-123')
    );
  });

  it('handles fetch errors gracefully', async () => {
    // Mock fetch to fail
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    render(
      <FilePreview 
        fileId="file-123"
        projectId="project-456"
      />
    );
    
    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // After fetch fails, should show error message
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    
    render(
      <FilePreview 
        filename="test.tsx"
        content="const test = () => <div>Test</div>;"
        onClose={handleClose}
      />
    );
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
}); 