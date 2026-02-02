import { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PlayIcon, 
  PauseIcon, 
  XIcon, 
  RefreshCwIcon,
  TrashIcon,
  PlusIcon
} from 'lucide-react';

interface TaskControlsCardProps {
  projectId?: string;
  onCreateTask?: (taskData: any) => void;
  onStartTask?: (taskId: string) => void;
  onStopTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onRefreshTasks?: () => void;
  disabled?: boolean;
}

export function TaskControlsCard({
  projectId,
  onCreateTask,
  onStartTask,
  onStopTask,
  onCancelTask,
  onDeleteTask,
  onRefreshTasks,
  disabled = false
}: TaskControlsCardProps) {
  const [isCreatingTask, setIsCreatingTask] = useState(false);
 
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Task Controls</CardTitle>
        <CardDescription>
          Manage task automation for this project
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={onRefreshTasks}
            disabled={disabled}
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button 
            size="sm"
            onClick={() => setIsCreatingTask(!isCreatingTask)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 