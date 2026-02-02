interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({ 
  label, 
  error, 
  helperText, 
  className = '', 
  ...props 
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        className={`
          block w-full rounded-md border 
          ${error 
            ? 'border-destructive focus:border-destructive focus:ring-destructive' 
            : 'border-border-default focus:border-accent-orange focus:ring-accent-orange'
          }
          text-black bg-white dark:text-white dark:bg-background-tertiary shadow-sm 
          placeholder:text-text-muted
          transition-colors
          sm:text-sm
          ${className}
        `}
        {...props}
      />
      {(error || helperText) && (
        <p className={`text-sm ${error ? 'text-destructive' : 'text-text-muted'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  )
}
