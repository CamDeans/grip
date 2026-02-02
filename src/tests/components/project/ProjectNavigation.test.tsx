import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectNavigation } from '@/components/project/ProjectNavigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/dashboard/projects/test-project-id'),
  useParams: jest.fn().mockReturnValue({ id: 'test-project-id' }),
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
  it('renders navigation items correctly', () => {
    render(<ProjectNavigation />);
    
    // Check if all navigation items are present
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
  
  it('correctly highlights active navigation item', () => {
    render(<ProjectNavigation />);
    
    // The "Overview" item should be active based on the mocked pathname
    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink).toHaveClass('bg-primary');
    
    // Other items should not be active
    const planningLink = screen.getByText('Planning').closest('a');
    expect(planningLink).not.toHaveClass('bg-primary');
  });
  
  it('uses correct href attributes for navigation links', () => {
    render(<ProjectNavigation />);
    
    // Check if links have correct href attributes
    const links = screen.getAllByTestId('mock-link');
    
    // Overview link
    expect(links[0]).toHaveAttribute('href', '/dashboard/projects/test-project-id');
    
    // Planning link
    expect(links[1]).toHaveAttribute('href', '/dashboard/projects/test-project-id/planning');
    
    // Development (enhanced chat) link
    expect(links[2]).toHaveAttribute('href', '/dashboard/projects/test-project-id/enhanced-chat');
    
    // Settings link
    expect(links[3]).toHaveAttribute('href', '/dashboard/projects/test-project-id/settings');
  });
  
  it('displays icons for each navigation item', () => {
    render(<ProjectNavigation />);
    
    // Check if icons are rendered (indirect check via aria-hidden attributes typically used for icons)
    const links = screen.getAllByTestId('mock-link');
    
    for (const link of links) {
      const iconElement = link.querySelector('[aria-hidden="true"]');
      expect(iconElement).toBeInTheDocument();
    }
  });
}); 