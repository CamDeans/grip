import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectNavigation } from '@/components/project/ProjectNavigation';

// Mock next/navigation (pathname matches component's /projects/:id routes)
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/projects/test-project-id'),
  useParams: jest.fn(() => ({ id: 'test-project-id' })),
}));

// Mock next/link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href, className }: { children: React.ReactNode, href: string, className?: string }) => {
    return (
      <a href={href} className={className} data-testid="mock-link">
        {children}
      </a>
    );
  };
  
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('ProjectNavigation Component', () => {
  beforeEach(() => {
    const nav = require('next/navigation') as { usePathname: jest.Mock; useParams: jest.Mock }
    nav.usePathname.mockReturnValue('/projects/test-project-id')
    nav.useParams.mockReturnValue({ id: 'test-project-id' })
  })

  it('renders navigation items correctly', () => {
    render(<ProjectNavigation />);
    
    // Check if all navigation items are present (current nav: Home, Enhanced Chat, Code Generator, Test DB)
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Enhanced Chat')).toBeInTheDocument();
    expect(screen.getByText('Code Generator')).toBeInTheDocument();
    expect(screen.getByText('Test DB')).toBeInTheDocument();
  });
  
  it('correctly highlights active navigation item', () => {
    render(<ProjectNavigation />);
    
    // The "Home" item should be active based on the mocked pathname /projects/test-project-id
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/projects/test-project-id');
    
    // Enhanced Chat should not be active
    const chatLink = screen.getByText('Enhanced Chat').closest('a');
    expect(chatLink).toHaveAttribute('href', '/projects/test-project-id/enhanced-chat');
  });
  
  it('uses correct href attributes for navigation links', () => {
    render(<ProjectNavigation />);
    
    const links = screen.getAllByTestId('mock-link');
    
    expect(links[0]).toHaveAttribute('href', '/projects/test-project-id');
    expect(links[1]).toHaveAttribute('href', '/projects/test-project-id/enhanced-chat');
    expect(links[2]).toHaveAttribute('href', '/projects/test-project-id/code-generator');
    expect(links[3]).toHaveAttribute('href', '/projects/test-project-id/test-db');
  });
  
  it('displays icons for each navigation item', () => {
    render(<ProjectNavigation />);
    
    const links = screen.getAllByTestId('mock-link');
    for (const link of links) {
      const iconElement = link.querySelector('[aria-hidden="true"]');
      expect(iconElement).toBeInTheDocument();
    }
  });
}); 