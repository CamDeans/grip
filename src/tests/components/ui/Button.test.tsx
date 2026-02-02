import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from './mocks/Button';

describe('Button component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByText('Click me');
    
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('text-primary-foreground');
    expect(button.className).toContain('h-10');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>);
    let button = screen.getByText('Destructive');
    expect(button.className).toContain('bg-destructive');
    expect(button.className).toContain('text-destructive-foreground');
    
    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByText('Outline');
    expect(button.className).toContain('border');
    expect(button.className).toContain('border-input');
    
    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByText('Secondary');
    expect(button.className).toContain('bg-secondary');
    expect(button.className).toContain('text-secondary-foreground');
    
    rerender(<Button variant="ghost">Ghost</Button>);
    button = screen.getByText('Ghost');
    expect(button.className).toContain('hover:bg-accent');
    
    rerender(<Button variant="link">Link</Button>);
    button = screen.getByText('Link');
    expect(button.className).toContain('underline-offset-4');
    expect(button.className).toContain('text-primary');
    
    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByText('Danger');
    expect(button.className).toContain('bg-destructive');
    expect(button.className).toContain('text-white');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    let button = screen.getByText('Default');
    expect(button.className).toContain('h-10');
    expect(button.className).toContain('px-4');
    
    rerender(<Button size="sm">Small</Button>);
    button = screen.getByText('Small');
    expect(button.className).toContain('h-9');
    expect(button.className).toContain('px-3');
    
    rerender(<Button size="lg">Large</Button>);
    button = screen.getByText('Large');
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('px-8');
    
    rerender(<Button size="icon">Icon</Button>);
    button = screen.getByText('Icon');
    expect(button.className).toContain('h-10');
    expect(button.className).toContain('w-10');
    expect(button.className).toContain('p-2');
  });

  it('renders in loading state', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('button')).toBeDisabled();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('renders with an icon', () => {
    const iconMock = <span data-testid="test-icon">✓</span>;
    render(<Button icon={iconMock}>With Icon</Button>);
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not trigger onClick when in loading state', () => {
    const handleClick = jest.fn();
    render(<Button isLoading onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByTestId('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies additional className', () => {
    render(<Button className="custom-class">With Class</Button>);
    
    const button = screen.getByText('With Class');
    expect(button.className).toContain('custom-class');
    expect(button.className).toContain('bg-primary'); // Still has default classes
  });
}); 