'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { AdminControlsCard } from '@/components/admin/AdminControlsCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { AlertTriangleIcon, RefreshCwIcon, DownloadIcon, ShieldAlertIcon } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { useSession } from 'next-auth/react'

// Type for user with admin fields
interface AdminUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  roles?: string[];
  isAdmin?: boolean;
}

export default function SystemControlsPage() {
  const [refreshTimestamp, setRefreshTimestamp] = useState<Date>(new Date())
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Check if user has admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // First check session
        if (status === 'loading') return;
        if (!session) {
          router.push('/auth/signin');
          return;
        }
        
        // Check if user has admin role using the user as AdminUser interface
        const user = session.user as unknown as AdminUser;
        const hasAdminRole = user?.role === 'admin' || 
                          (user?.roles && Array.isArray(user.roles) && user.roles.includes('admin')) ||
                          user?.isAdmin === true;
        
        if (!hasAdminRole) {
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access admin controls',
            variant: 'destructive'
          });
          router.push('/dashboard');
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin access:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminAccess();
  }, [session, status, router]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    setRefreshTimestamp(new Date())
  }
  
  // Handle system start
  const handleSystemStart = async () => {
    try {
      const response = await fetch('/api/admin/system-state/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start system');
      }
      
      const data = await response.json();
      
      handleRefresh();
      return true;
    } catch (error) {
      console.error('Error starting system:', error);
      return false;
    }
  };
  
  // Handle system pause
  const handleSystemPause = async () => {
    try {
      const response = await fetch('/api/admin/system-state/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to pause system');
      }
      
      const data = await response.json();
      
      handleRefresh();
      return true;
    } catch (error) {
      console.error('Error pausing system:', error);
      return false;
    }
  };
  
  // Handle system settings update
  const handleUpdateSettings = async (settings: any) => {
    try {
      const response = await fetch('/api/admin/system-state', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update system settings');
      }
      
      const data = await response.json();
      
      handleRefresh();
      return true;
    } catch (error) {
      console.error('Error updating system settings:', error);
      return false;
    }
  };
  
  // Handle export logs
  const handleExportLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs/export');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export logs');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `g-r-i-p-logs-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Logs exported successfully'
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to export logs',
        variant: 'destructive'
      });
    }
  };
  
  // If loading, show loading state
  if (isLoading) {
    return (
      <AdminDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div>
        </div>
      </AdminDashboardLayout>
    );
  }
  
  // If not admin, this should never show due to the redirect, but as a safeguard
  if (!isAdmin) {
    return (
      <AdminDashboardLayout>
        <div className="space-y-6">
          <Card className="bg-destructive/10 border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-destructive">
                <ShieldAlertIcon className="h-5 w-5 mr-2" />
                Access Denied
              </CardTitle>
              <CardDescription className="text-destructive">
                You do not have permission to access admin controls.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminDashboardLayout>
    );
  }
  
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">System Controls</h1>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleExportLogs}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </div>
        
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-amber-800 dark:text-amber-300">
              <AlertTriangleIcon className="h-5 w-5 mr-2" />
              System Administrator Controls
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-400">
              These controls affect the entire system. Use with caution.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Pausing the system will prevent new tasks from being processed, but will not affect tasks that are already running.
              Changing concurrency settings may affect system performance.
            </p>
          </CardContent>
        </Card>
        
        <AdminControlsCard 
          key={refreshTimestamp.toString()} 
          onStart={handleSystemStart}
          onPause={handleSystemPause}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>
    </AdminDashboardLayout>
  )
} 