import { useState } from 'react';
import { Button } from '@/components/ui';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface InitializeProjectButtonProps {
  projectId: string;
  onSuccess?: (projectPath: string) => void;
}

export function InitializeProjectButton({ projectId, onSuccess }: InitializeProjectButtonProps) {
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = async () => {
    try {
      setIsInitializing(true);
      const response = await fetch('/api/project/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize project');
      }

      toast.success('Project initialized successfully!', {
        description: `Project environment created at: ${data.projectPath}`,
      });

      onSuccess?.(data.projectPath);
    } catch (error) {
      toast.error('Failed to initialize project', {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <Button
      onClick={handleInitialize}
      disabled={isInitializing}
      className="w-full mt-4"
    >
      {isInitializing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Initializing Project...
        </>
      ) : (
        'Initialize Project Environment'
      )}
    </Button>
  );
} 