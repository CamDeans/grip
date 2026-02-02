'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout';

export default function DebugTasksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskType, setTaskType] = useState('generate');
  const [status, setStatus] = useState('running');
  const [projectId, setProjectId] = useState('');
  const [debugData, setDebugData] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedLogOutput, setSelectedLogOutput] = useState<string | null>(null);

  // Fetch debug data
  const fetchDebugData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check Redis connection
      const redisResponse = await fetch('/api/debug/redis');
      const redisData = await redisResponse.json();
      
      // Check MongoDB connection
      const mongoResponse = await fetch('/api/debug/mongodb');
      const mongoData = await mongoResponse.json();
      
      // Get system info
      const systemResponse = await fetch('/api/debug/system');
      const systemData = await systemResponse.json();
      
      setDebugData({
        redis: redisData,
        mongodb: mongoData,
        system: systemData,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Debug error:', error);
      setError(error.message || 'Failed to fetch debug data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchDebugData();
  }, [fetchDebugData]);
  
  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleString();
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-success';
      case 'failed': return 'bg-destructive';
      case 'running': return 'bg-primary';
      case 'pending': case 'queued': return 'bg-yellow-500';
      case 'cancelled': return 'bg-text-muted';
      default: return 'bg-border';
    }
  };

  return (
    <AdminDashboardLayout>
      <div className="container mx-auto py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Task Debugging Console</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Task Type</label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Task Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generate">Generate</SelectItem>
                    <SelectItem value="build">Build</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="deploy">Deploy</SelectItem>
                    <SelectItem value="analyze">Analyze</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Project ID (optional)</label>
                <Input
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="Project ID"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchDebugData}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Spinner size="sm" className="mr-2" /> : null}
                  Refresh Data
                </Button>
              </div>
            </div>
            
            {error ? (
              <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
                {error}
              </div>
            ) : null}
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1 border-r">
                <h3 className="font-medium mb-2">Build Logs ({debugData?.buildLogCount || 0})</h3>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : debugData?.buildLogs?.length > 0 ? (
                  <div className="space-y-2 pr-2 max-h-[400px] overflow-y-auto">
                    {debugData.buildLogs.map((log: any) => (
                      <div
                        key={log.taskId}
                        className={`p-2 cursor-pointer rounded-md transition-colors ${
                          selectedTaskId === log.taskId 
                            ? 'bg-background-secondary border-primary border' 
                            : 'hover:bg-background-secondary/50'
                        }`}
                        onClick={() => {
                          setSelectedTaskId(log.taskId);
                          setSelectedLogOutput(log.output);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{log.command}</span>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          Task ID: {log.taskId}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          {log.startTime ? formatRelativeTime(log.startTime) : 'No start time'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-text-secondary">
                    No logs found
                  </div>
                )}
              </div>
              
              <div className="col-span-3">
                <h3 className="font-medium mb-2">Log Output</h3>
                {selectedLogOutput ? (
                  <div className="bg-background-primary text-text-primary p-4 rounded-md font-mono text-sm overflow-auto whitespace-pre-wrap max-h-[400px]">
                    {selectedLogOutput}
                  </div>
                ) : (
                  <div className="text-center py-4 text-text-secondary">
                    Select a log to view output
                  </div>
                )}
                
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Debug Details</h3>
                  {debugData ? (
                    <div className="text-black bg-white dark:text-white dark:bg-background-tertiary p-4 rounded-md text-sm font-mono overflow-auto max-h-[200px]">
                      <pre>{JSON.stringify(debugData.query || {}, null, 2)}</pre>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Task List ({debugData?.taskCount || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : debugData?.tasks?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="text-black bg-white dark:text-white dark:bg-background-tertiary">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Command</th>
                      <th className="px-4 py-2 text-left">Start Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debugData.tasks.map((task: any) => (
                      <tr key={task.id} className="border-b">
                        <td className="px-4 py-2">{task.name}</td>
                        <td className="px-4 py-2">{task.type}</td>
                        <td className="px-4 py-2">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{task.command}</td>
                        <td className="px-4 py-2">
                          {task.startTime 
                            ? formatRelativeTime(task.startTime)
                            : 'Not started'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-text-secondary">
                No tasks found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  );
} 