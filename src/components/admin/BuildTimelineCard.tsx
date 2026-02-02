import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientLoggingService } from '@/lib/services/clientLoggingService'
import { ChevronRightIcon, ClockIcon } from 'lucide-react'
import { IBuildLogData } from '@/lib/models/clientModels/BuildLog'

interface BuildTimelineCardProps {
  projectId?: string;
  limit?: number;
  refreshInterval?: number;
}

interface TimelineItem {
  id: string;
  command: string;
  status: string;
  timestamp: Date | string;
  duration?: number;
  taskType: string;
  phase?: string;
  step?: string;
}

export function BuildTimelineCard({ 
  projectId, 
  limit = 10, 
  refreshInterval = 10000 
}: BuildTimelineCardProps) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch timeline data
  const fetchTimelineData = async () => {
    try {
      setError(null);
      
      const logs = await ClientLoggingService.getProjectLogs(projectId || '', 50);
      
      if (logs) {
        // Sort by timestamp (most recent first)
        const sortedLogs = logs.sort((a, b) => {
          const dateA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const dateB = b.startTime ? new Date(b.startTime).getTime() : 0;
          return dateB - dateA;
        });
        
        // Map to timeline items
        const items: TimelineItem[] = sortedLogs.slice(0, limit).map(log => {
          // Ensure timestamp is a proper Date object
          let timestamp: Date;
          try {
            timestamp = log.startTime ? new Date(log.startTime) : new Date();
            // Verify it's a valid date
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date(); // Fallback to current time if invalid
            }
          } catch (e) {
            timestamp = new Date(); // Fallback to current time on error
            console.error('Error parsing date:', e);
          }
          
          return {
            id: log.taskId,
            command: log.command,
            status: log.status,
            timestamp,
            duration: log.duration,
            taskType: log.taskType,
            phase: log.phase,
            step: log.step
          };
        });
        
        setTimelineItems(items);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch build timeline');
      console.error('Error fetching build timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on initial render and set up refresh interval
  useEffect(() => {
    fetchTimelineData();
    
    const intervalId = setInterval(() => {
      fetchTimelineData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [projectId, limit, refreshInterval]);

  // Helper to get status badge color
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-success';
      case 'failed': return 'bg-destructive';
      case 'running': return 'bg-primary';
      case 'pending': case 'queued': return 'bg-yellow-500';
      case 'cancelled': return 'bg-text-muted';
      default: return 'bg-border';
    }
  };

  // Format duration nicely
  const formatDuration = (duration?: number): string => {
    if (!duration) return 'N/A';
    
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Format relative time
  const formatRelativeTime = (date: Date | string): string => {
    // Ensure we're working with a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return dateObj.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Recent Builds</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center text-destructive py-4">{error}</div>
        ) : timelineItems.length === 0 ? (
          <div className="text-center text-text-secondary py-8">No build history found</div>
        ) : (
          <div className="space-y-3">
            {timelineItems.map(item => (
              <div 
                key={item.id} 
                className="flex items-start p-3 border border-border hover:border-border-hover rounded-lg transition-colors"
              >
                <div className="flex-shrink-0 self-center">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                </div>
                <div className="ml-4 flex-grow">
                  <div className="flex justify-between">
                    <div className="font-medium truncate max-w-[200px]">{item.command}</div>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-text-secondary mt-1">
                    {item.phase && item.step && (
                      <span>Phase: {item.phase}, Step: {item.step} | </span>
                    )}
                    <span className="capitalize">{item.taskType}</span>
                  </div>
                  <div className="flex items-center text-xs text-text-secondary mt-2">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {formatRelativeTime(item.timestamp)}
                    {item.duration && (
                      <span className="ml-3">Duration: {formatDuration(item.duration)}</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 self-center ml-2">
                  <ChevronRightIcon className="h-5 w-5 text-text-secondary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 