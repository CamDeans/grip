import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientLoggingService } from '@/lib/services/clientLoggingService'
import { IBuildLogData } from '@/lib/models/clientModels/BuildLog'
import { ClientTime } from '@/components/ui/ClientOnly'

interface BuildStatusCardProps {
  projectId?: string;
  refreshInterval?: number;
}

interface BuildStats {
  total: number;
  byStatus: {
    completed: number;
    failed: number;
    running: number;
    pending: number;
    cancelled: number;
  };
  byType: {
    build: number;
    test: number;
    deploy: number;
    generate: number;
    analyze: number;
    other: number;
  };
  lastUpdated: Date;
}

export function BuildStatusCard({ projectId, refreshInterval = 10000 }: BuildStatusCardProps) {
  const [stats, setStats] = useState<BuildStats>({
    total: 0,
    byStatus: {
      completed: 0,
      failed: 0,
      running: 0,
      pending: 0,
      cancelled: 0
    },
    byType: {
      build: 0,
      test: 0,
      deploy: 0,
      generate: 0,
      analyze: 0,
      other: 0
    },
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Client-side only state to prevent hydration issues
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after hydration is complete
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch build stats
  const fetchBuildStats = async () => {
    try {
      setError(null);
      
      // In a real implementation, we'd fetch this from a dedicated endpoint
      // that summarizes data. For now, we'll use the logging service and 
      // calculate stats from logs.
      const logs = await ClientLoggingService.getProjectLogs(projectId || '', 500);
      
      if (logs) {
        const newStats: BuildStats = {
          total: logs.length,
          byStatus: {
            completed: 0,
            failed: 0,
            running: 0,
            pending: 0,
            cancelled: 0
          },
          byType: {
            build: 0,
            test: 0,
            deploy: 0,
            generate: 0,
            analyze: 0,
            other: 0
          },
          lastUpdated: new Date()
        };
        
        // Count tasks by status and type
        logs.forEach(log => {
          // Count by status
          if (log.status.toLowerCase() === 'completed') newStats.byStatus.completed++;
          else if (log.status.toLowerCase() === 'failed') newStats.byStatus.failed++;
          else if (log.status.toLowerCase() === 'running') newStats.byStatus.running++;
          else if (log.status.toLowerCase() === 'pending' || log.status.toLowerCase() === 'queued') newStats.byStatus.pending++;
          else if (log.status.toLowerCase() === 'cancelled') newStats.byStatus.cancelled++;
          
          // Count by type
          if (log.taskType.toLowerCase() === 'build') newStats.byType.build++;
          else if (log.taskType.toLowerCase() === 'test') newStats.byType.test++;
          else if (log.taskType.toLowerCase() === 'deploy') newStats.byType.deploy++;
          else if (log.taskType.toLowerCase() === 'generate') newStats.byType.generate++;
          else if (log.taskType.toLowerCase() === 'analyze') newStats.byType.analyze++;
          else newStats.byType.other++;
        });
        
        setStats(newStats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch build statistics');
      console.error('Error fetching build stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats on initial render and set up refresh interval
  useEffect(() => {
    fetchBuildStats();
    
    const intervalId = setInterval(() => {
      fetchBuildStats();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [projectId, refreshInterval]);

  // Helper to get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'failed': return 'bg-destructive';
      case 'running': return 'bg-primary';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-text-muted';
      default: return 'bg-border';
    }
  };
  
  // Helper to get type badge color
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'build': return 'bg-accent-blue';
      case 'test': return 'bg-primary';
      case 'deploy': return 'bg-success';
      case 'generate': return 'bg-yellow-500';
      case 'analyze': return 'bg-teal-500';
      default: return 'bg-text-muted';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Build Status</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="text-center text-destructive py-4">{error}</div>
        ) : (
          <>
            <div className="mb-4">
              <div className="text-sm text-text-secondary mb-1">Total Tasks</div>
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-xs text-text-secondary mt-1">
                Last updated <ClientTime time={stats.lastUpdated} format="time" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 min-w-0">
              <div>
                <div className="text-sm font-medium mb-2">By Status</div>
                <div className="space-y-2">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <Badge className={`${getStatusColor(status)} text-white shrink-0`}>
                          {count}
                        </Badge>
                        <span className="text-sm capitalize truncate">{status}</span>
                      </div>
                      <div className="text-xs text-text-secondary">
                        {stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">By Type</div>
                <div className="space-y-2">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <Badge className={`${getTypeColor(type)} text-white shrink-0`}>
                          {count}
                        </Badge>
                        <span className="text-sm capitalize truncate">{type}</span>
                      </div>
                      <div className="text-xs text-text-secondary">
                        {stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Build Progress Bar */}
            <div>
              <div className="text-sm font-medium mb-2">Overall Completion</div>
              <div className="w-full bg-background-tertiary rounded-full h-2.5">
                {stats.total > 0 && (
                  <div 
                    className="bg-primary h-2.5 rounded-full min-w-0"
                    style={{ 
                      width: `${Math.round((stats.byStatus.completed / stats.total) * 100)}%` 
                    }}
                  />
                )}
              </div>
              <div className="text-xs text-text-secondary mt-1 text-right">
                {stats.total > 0 ? Math.round((stats.byStatus.completed / stats.total) * 100) : 0}% Complete
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 