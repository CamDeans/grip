'use client';

import React, { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * A wrapper component that only renders its children on the client side
 * Use this to prevent hydration errors with time displays, date formatting,
 * or other content that would differ between server and client.
 * 
 * @example
 * <ClientOnly fallback={<div>Loading...</div>}>
 *   <TimeDisplay date={new Date()} />
 * </ClientOnly>
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * A specialized version that formats time with consistent options
 * to avoid hydration errors with date/time display.
 */
export function ClientTime({ 
  time, 
  format = 'time',
  fallback = 'Loading...' 
}: { 
  time: Date | string | number;
  format?: 'time' | 'datetime' | 'relative';
  fallback?: string;
}) {
  const [formattedTime, setFormattedTime] = useState<string>(fallback);
  
  useEffect(() => {
    try {
      const date = time instanceof Date ? time : new Date(time);
      
      if (format === 'time') {
        const options: Intl.DateTimeFormatOptions = { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit', 
          hour12: true 
        };
        setFormattedTime(date.toLocaleTimeString('en-US', options));
      } 
      
      else if (format === 'datetime') {
        const options: Intl.DateTimeFormatOptions = { 
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit', 
          hour12: true 
        };
        setFormattedTime(date.toLocaleString('en-US', options));
      } 
      
      else if (format === 'relative') {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        
        if (diffSecs < 0) setFormattedTime('in the future');
        else if (diffSecs < 60) setFormattedTime(`${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`);
        else {
          const diffMins = Math.floor(diffSecs / 60);
          if (diffMins < 60) setFormattedTime(`${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`);
          else {
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) setFormattedTime(`${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`);
            else {
              const diffDays = Math.floor(diffHours / 24);
              if (diffDays < 7) setFormattedTime(`${diffDays} day${diffDays !== 1 ? 's' : ''} ago`);
              else {
                // For older dates, use a standard date format
                setFormattedTime(date.toLocaleString('en-US'));
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error formatting time in ClientTime component:', error);
      setFormattedTime(fallback);
    }
  }, [time, format, fallback]);

  return (
    <ClientOnly fallback={fallback}>
      {formattedTime}
    </ClientOnly>
  );
} 