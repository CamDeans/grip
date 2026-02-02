/**
 * Date Utilities for G.R.I.P.
 * Provides consistent date formatting across the application to avoid hydration errors
 */

type DateType = Date | string | number;

/**
 * Format a date as time (HH:MM:SS AM/PM)
 * @param date Date to format
 * @returns Formatted time string
 */
export function formatTime(date: DateType): string {
  if (!date) return 'N/A';
  
  try {
    const options: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    };
    
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Ensure consistent locale
    return dateObj.toLocaleTimeString('en-US', options);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date as a full date and time
 * @param date Date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: DateType): string {
  if (!date) return 'N/A';
  
  try {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    };
    
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Ensure consistent locale
    return dateObj.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date as a relative time (e.g., "5 minutes ago")
 * @param date Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: DateType): string {
  if (!date) return 'N/A';
  
  try {
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    // Handle future dates
    if (diffSecs < 0) return 'in the future';
    
    // Convert to appropriate unit
    if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    // For older dates, use a standard date format
    return formatDateTime(dateObj);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
} 