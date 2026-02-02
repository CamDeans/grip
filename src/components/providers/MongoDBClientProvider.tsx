'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import polyfill directly - this is important to ensure it's loaded early
import '@/lib/mongodb-browser-polyfill';

// MongoDB client provider component
const MongoDBClientProvider = ({ children }: { children: React.ReactNode }) => {
  const [polyfillLoaded, setPolyfillLoaded] = useState(false);

  useEffect(() => {
    // Apply polyfill in browser environment
    if (typeof window !== 'undefined') {
      // Ensure process.emitWarning exists
      if (!window.process) window.process = {} as any;
      if (!window.process.emitWarning) {
        window.process.emitWarning = function(warning: any, options: any) {
          console.warn('[MongoDB Warning Polyfill]:', warning, options);
        };
      }
      
      // Ensure global.process.emitWarning exists
      if (!global.process) global.process = {} as any;
      if (!global.process.emitWarning) {
        global.process.emitWarning = window.process.emitWarning;
      }
      
      console.log('MongoDB polyfill applied in client component');
      setPolyfillLoaded(true);
    }
  }, []);

  return <>{children}</>;
};

// Use dynamic import to ensure this only runs on the client
export default dynamic(() => Promise.resolve(MongoDBClientProvider), {
  ssr: false,
}); 