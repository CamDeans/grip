"use client"

import * as React from "react"
import { cn } from "@/lib/client-utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  color?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, color, ...props }, ref) => {
    const percentage = Math.min(Math.max(0, value), max) / max * 100;
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full flex-1 transition-all",
            color || "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress } 