interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export function TextArea({ 
  label, 
  error, 
  helperText, 
  className = '', 
  ...props 
}: TextAreaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        className={`
          block w-full rounded-md border px-3 py-2
          ${error 
            ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive' 
            : 'border-border bg-background-primary focus:border-primary focus:ring-1 focus:ring-primary'
          }
          text-text-primary placeholder:text-text-secondary
          focus:outline-none transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          text-sm
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
