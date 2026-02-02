import React from 'react';

interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'danger';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

// This is a simplified mock of the Button component for testing
const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  isLoading,
  icon,
  className = '',
  disabled,
  onClick,
  children
}) => {
  // Create class names based on variant and size
  let classNames = `button-${variant} button-${size} ${className}`;
  
  if (variant === 'default') classNames += ' bg-primary text-primary-foreground';
  if (variant === 'destructive') classNames += ' bg-destructive text-destructive-foreground';
  if (variant === 'outline') classNames += ' border border-input';
  if (variant === 'secondary') classNames += ' bg-secondary text-secondary-foreground';
  if (variant === 'ghost') classNames += ' hover:bg-accent';
  if (variant === 'link') classNames += ' underline-offset-4 text-primary';
  if (variant === 'danger') classNames += ' bg-destructive text-white';
  
  if (size === 'default') classNames += ' h-10 px-4 py-2';
  if (size === 'sm') classNames += ' h-9 px-3';
  if (size === 'lg') classNames += ' h-11 px-8';
  if (size === 'icon') classNames += ' h-10 w-10 p-2';
  
  return (
    <button
      className={classNames}
      disabled={isLoading || disabled}
      onClick={onClick}
      data-testid="button"
    >
      {isLoading ? (
        <>
          <span className="mr-2 h-4 w-4 animate-spin">Loading</span>
          Loading...
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

Button.displayName = 'Button';

export { Button };
export type { ButtonProps }; 