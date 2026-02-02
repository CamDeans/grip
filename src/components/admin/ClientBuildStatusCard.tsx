'use client';

// Import polyfill first
import '@/lib/polyfill';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Import client-safe model instead of MongoDB model
import { IBuildLogData } from '@/lib/models/clientModels/BuildLog';

// Define props interface
interface BuildStatusCardProps {
  projectId?: string;
  refreshInterval?: number;
}

// Loading placeholder
const LoadingCard = () => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg font-medium">Build Status</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    </CardContent>
  </Card>
);

// Dynamically import the component with SSR disabled
const BuildStatusCard = dynamic(
  () => import('./BuildStatusCard').then((mod) => mod.BuildStatusCard),
  {
    ssr: false,
    loading: () => <LoadingCard />
  }
);

// Client wrapper component with additional polyfill
const ClientBuildStatusCard = (props: BuildStatusCardProps) => {
  // Apply polyfill in this component to ensure it's done before rendering
  useEffect(() => {
    // Ensure process.emitWarning exists even in nested contexts
    if (typeof window !== 'undefined') {
      // Check if global.process exists
      if (!global.process) {
        global.process = {} as any;
      }
      
      // Add emitWarning function
      if (!global.process.emitWarning) {
        global.process.emitWarning = function(warning: any, options: any) {
          console.warn('[GRIP BuildStatus Polyfill]:', warning, options);
        };
      }
      
      console.log('BuildStatusCard polyfill applied');
    }
  }, []);

  return <BuildStatusCard {...props} />;
};

export default ClientBuildStatusCard; 