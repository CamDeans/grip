import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  PlayIcon, 
  PauseIcon, 
  RefreshCwIcon,
  AlertTriangleIcon,
  SaveIcon,
  SettingsIcon
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// System state interface
interface SystemState {
  isRunning: boolean;
  concurrencyLimit: number;
  maxTasksPerProject: number;
  taskPrioritization: 'fifo' | 'priority' | 'deadline';
  errorHandlingMode: 'stop' | 'continue' | 'retry';
  logLevel: 'debug' | 'info' | 'warning' | 'error';
  allowHighPriorityOverride: boolean;
  maintenanceMode: boolean;
}

interface AdminControlsCardProps {
  onStart?: () => Promise<boolean>;
  onPause?: () => Promise<boolean>;
  onUpdateSettings?: (settings: Partial<SystemState>) => Promise<boolean>;
  disabled?: boolean;
}

export function AdminControlsCard({
  onStart,
  onPause,
  onUpdateSettings,
  disabled = false
}: AdminControlsCardProps) {
  const [loading, setLoading] = useState(false);
  const [systemState, setSystemState] = useState<SystemState>({
    isRunning: true,
    concurrencyLimit: 5,
    maxTasksPerProject: 10,
    taskPrioritization: 'priority',
    errorHandlingMode: 'retry',
    logLevel: 'info',
    allowHighPriorityOverride: true,
    maintenanceMode: false
  });
  const [editMode, setEditMode] = useState(false);
  const [settingsChanged, setSettingsChanged] = useState(false);
  
  // Fetch current system state
  useEffect(() => {
    const fetchSystemState = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/system-state');
        
        if (!response.ok) {
          throw new Error(`Error fetching system state: ${response.status}`);
        }
        
        const data = await response.json();
        setSystemState(data.state);
      } catch (error) {
        console.error('Error fetching system state:', error);
        toast({
          title: 'Error',
          description: 'Failed to load system state',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSystemState();
  }, []);
  
  // Handle system pause
  const handlePause = async () => {
    if (!onPause) return;
    
    try {
      setLoading(true);
      const success = await onPause();
      
      if (success) {
        setSystemState(prev => ({
          ...prev,
          isRunning: false
        }));
        
        toast({
          title: 'Success',
          description: 'Automation system paused'
        });
      } else {
        throw new Error('Failed to pause system');
      }
    } catch (error) {
      console.error('Error pausing system:', error);
      toast({
        title: 'Error',
        description: 'Failed to pause automation system',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle system start
  const handleStart = async () => {
    if (!onStart) return;
    
    try {
      setLoading(true);
      const success = await onStart();
      
      if (success) {
        setSystemState(prev => ({
          ...prev,
          isRunning: true
        }));
        
        toast({
          title: 'Success',
          description: 'Automation system started'
        });
      } else {
        throw new Error('Failed to start system');
      }
    } catch (error) {
      console.error('Error starting system:', error);
      toast({
        title: 'Error',
        description: 'Failed to start automation system',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle settings update
  const handleSaveSettings = async () => {
    if (!onUpdateSettings || !settingsChanged) return;
    
    try {
      setLoading(true);
      const success = await onUpdateSettings(systemState);
      
      if (success) {
        setSettingsChanged(false);
        setEditMode(false);
        
        toast({
          title: 'Success',
          description: 'Automation settings updated'
        });
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update automation settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle field change
  const handleChange = (field: keyof SystemState, value: any) => {
    setSystemState(prev => ({
      ...prev,
      [field]: value
    }));
    
    setSettingsChanged(true);
  };
  
  // Fix TypeScript errors by properly typing the checked parameters
  const handleMaintenanceModeChange = (checked: boolean) => {
    handleChange('maintenanceMode', checked);
  };

  const handlePriorityOverrideChange = (checked: boolean) => {
    handleChange('allowHighPriorityOverride', checked);
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">System Controls</CardTitle>
        <CardDescription>Manage automation system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* System Status */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium">System Status</h3>
              <p className="text-xs text-text-secondary mt-1">
                {systemState.isRunning ? 'Running' : 'Paused'}
              </p>
            </div>
            
            <div className="flex space-x-2">
              {systemState.isRunning ? (
                <Button
                  variant="outline"
                  onClick={handlePause}
                  disabled={disabled || loading || !onPause}
                >
                  <PauseIcon className="h-4 w-4 mr-2" />
                  Pause System
                </Button>
              ) : (
                <Button
                  onClick={handleStart}
                  disabled={disabled || loading || !onStart}
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Resume System
                </Button>
              )}
            </div>
          </div>
          
          <Separator />
          
          {/* System Settings */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">System Settings</h3>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                disabled={disabled || loading}
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                {editMode ? 'Cancel' : 'Edit Settings'}
              </Button>
            </div>
            
            {editMode ? (
              <div className="space-y-4">
                {/* Concurrency Settings */}
                <div className="space-y-2">
                  <label
                    htmlFor="concurrencyLimit"
                    className="text-sm font-medium leading-none"
                  >
                    Concurrent Tasks Limit: {systemState.concurrencyLimit}
                  </label>
                  <input
                    type="range"
                    id="concurrencyLimit"
                    min={1}
                    max={20}
                    step={1}
                    value={systemState.concurrencyLimit}
                    onChange={(e) => handleChange('concurrencyLimit', Number(e.target.value))}
                    disabled={disabled || loading}
                  />
                </div>
                
                {/* Max Tasks Per Project */}
                <div className="space-y-2">
                  <label
                    htmlFor="maxTasksPerProject"
                    className="text-sm font-medium leading-none"
                  >
                    Max Tasks Per Project: {systemState.maxTasksPerProject}
                  </label>
                  <input
                    type="range"
                    id="maxTasksPerProject"
                    min={1}
                    max={50}
                    step={1}
                    value={systemState.maxTasksPerProject}
                    onChange={(e) => handleChange('maxTasksPerProject', Number(e.target.value))}
                    disabled={disabled || loading}
                  />
                </div>
                
                {/* Task Prioritization */}
                <div className="space-y-2">
                  <label
                    htmlFor="taskPrioritization"
                    className="text-sm font-medium leading-none"
                  >
                    Task Prioritization
                  </label>
                  <select
                    id="taskPrioritization"
                    value={systemState.taskPrioritization}
                    onChange={(e) => handleChange('taskPrioritization', e.target.value as 'fifo' | 'priority' | 'deadline')}
                    disabled={disabled || loading}
                    className="w-full h-10 rounded-md border border-border-default text-black bg-white dark:text-white dark:bg-background-tertiary px-3 py-2 text-sm"
                  >
                    <option value="fifo">First In, First Out</option>
                    <option value="priority">Priority-based</option>
                    <option value="deadline">Deadline-based</option>
                  </select>
                </div>
                
                {/* Error Handling Mode */}
                <div className="space-y-2">
                  <label
                    htmlFor="errorHandlingMode"
                    className="text-sm font-medium leading-none"
                  >
                    Error Handling
                  </label>
                  <select
                    id="errorHandlingMode"
                    value={systemState.errorHandlingMode}
                    onChange={(e) => handleChange('errorHandlingMode', e.target.value as 'stop' | 'continue' | 'retry')}
                    disabled={disabled || loading}
                    className="w-full h-10 rounded-md border border-border-default text-black bg-white dark:text-white dark:bg-background-tertiary px-3 py-2 text-sm"
                  >
                    <option value="stop">Stop on Error</option>
                    <option value="continue">Continue on Error</option>
                    <option value="retry">Retry on Error</option>
                  </select>
                </div>
                
                {/* Log Level */}
                <div className="space-y-2">
                  <label
                    htmlFor="logLevel"
                    className="text-sm font-medium leading-none"
                  >
                    Log Level
                  </label>
                  <select
                    id="logLevel"
                    value={systemState.logLevel}
                    onChange={(e) => handleChange('logLevel', e.target.value as 'debug' | 'info' | 'warning' | 'error')}
                    disabled={disabled || loading}
                    className="w-full h-10 rounded-md border border-border-default text-black bg-white dark:text-white dark:bg-background-tertiary px-3 py-2 text-sm"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                
                {/* Priority Override */}
                <div className="flex items-center justify-between space-x-2">
                  <label 
                    htmlFor="priorityOverride"
                    className="text-sm font-medium leading-none"
                  >
                    Allow High Priority Override
                  </label>
                  {/* aria-checked is set from state; valid values "true" | "false" */}
                  <div
                    role="switch"
                    id="priorityOverride"
                    aria-checked={systemState.allowHighPriorityOverride ? 'true' : 'false'}
                    aria-label="Allow high priority override"
                    title="Allow high priority override"
                    className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${systemState.allowHighPriorityOverride ? 'bg-primary' : 'bg-border'}`}
                    onClick={disabled || loading ? undefined : () => handlePriorityOverrideChange(!systemState.allowHighPriorityOverride)}
                  >
                    <span
                      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${systemState.allowHighPriorityOverride ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </div>
                </div>
                
                {/* Maintenance Mode */}
                <div className="flex items-center justify-between space-x-2">
                  <div>
                    <label 
                      htmlFor="maintenanceMode"
                      className="text-sm font-medium leading-none"
                    >
                      Maintenance Mode
                    </label>
                    <p className="text-xs text-text-secondary mt-1">
                      Blocks new tasks but allows current tasks to complete
                    </p>
                  </div>
                  {/* aria-checked is set from state; valid values "true" | "false" */}
                  <div
                    role="switch"
                    id="maintenanceMode"
                    aria-checked={systemState.maintenanceMode ? 'true' : 'false'}
                    aria-label="Maintenance mode"
                    title="Maintenance mode"
                    className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${systemState.maintenanceMode ? 'bg-primary' : 'bg-border'}`}
                    onClick={disabled || loading ? undefined : () => handleMaintenanceModeChange(!systemState.maintenanceMode)}
                  >
                    <span
                      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${systemState.maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditMode(false);
                      setSettingsChanged(false);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveSettings}
                    disabled={!settingsChanged || loading || disabled || !onUpdateSettings}
                  >
                    <SaveIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-secondary">Concurrent Tasks:</span>
                    <span className="ml-2">{systemState.concurrencyLimit}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Max Tasks/Project:</span>
                    <span className="ml-2">{systemState.maxTasksPerProject}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Prioritization:</span>
                    <span className="ml-2">
                      {systemState.taskPrioritization === 'fifo' && 'First In, First Out'}
                      {systemState.taskPrioritization === 'priority' && 'Priority-based'}
                      {systemState.taskPrioritization === 'deadline' && 'Deadline-based'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Error Handling:</span>
                    <span className="ml-2">
                      {systemState.errorHandlingMode === 'stop' && 'Stop on Error'}
                      {systemState.errorHandlingMode === 'continue' && 'Continue on Error'}
                      {systemState.errorHandlingMode === 'retry' && 'Retry on Error'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Log Level:</span>
                    <span className="ml-2 capitalize">{systemState.logLevel}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Priority Override:</span>
                    <span className="ml-2">{systemState.allowHighPriorityOverride ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
                
                {systemState.maintenanceMode && (
                  <div className="mt-4 p-2 border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-md flex items-center">
                    <AlertTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-sm">System is in maintenance mode</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border-default pt-3 text-xs text-text-secondary">
        {loading ? 
          'Processing request...' : 
          systemState.isRunning ? 
            'System is running and processing tasks' :
            'System is paused - tasks will not be processed'
        }
      </CardFooter>
    </Card>
  );
} 