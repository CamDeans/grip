import React from 'react'
import { cn } from '@/lib/client-utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void
}

// Root select component
const Select: React.FC<SelectProps> = ({ children, onValueChange, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onValueChange) {
      onValueChange(e.target.value)
    }
    if (props.onChange) {
      props.onChange(e)
    }
  }

  return (
    <select 
      {...props}
      onChange={handleChange}
      className={cn(
        "w-full h-10 rounded-md border border-border-default text-black bg-white dark:text-white dark:bg-background-tertiary px-3 py-2 text-sm",
        props.className
      )}
      aria-label={props['aria-label'] || props.placeholder || "Select item"}
    >
      {children}
    </select>
  )
}

// Value component (doesn't render anything)
const SelectValue: React.FC<{ placeholder?: string }> = () => null

// Trigger component (doesn't render anything)
interface SelectTriggerProps {
  className?: string;
  id?: string;
  children?: React.ReactNode;
}
const SelectTrigger: React.FC<SelectTriggerProps> = () => null

// Content component (doesn't render anything)
const SelectContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => children

// Item component for options
const SelectItem: React.FC<{ value: string, children?: React.ReactNode }> = ({ value, children }) => (
  <option value={value}>{children}</option>
)

// Group component
const SelectGroup: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <optgroup>
    {children}
  </optgroup>
)

const SelectLabel = () => null
const SelectSeparator = () => null

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator
} 