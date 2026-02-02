'use client'

import { useState, useEffect } from 'react'
import { useParams, usePathname } from 'next/navigation'

// Project layout with navigation
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const [projectName, setProjectName] = useState('Project')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const projectId = params.id

  // Fetch project details
  useEffect(() => {
    let isMounted = true;
    
    async function fetchProjectDetails() {
      if (!projectId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          // Add cache: 'no-store' to prevent caching issues
          cache: 'no-store',
          // Add a timeout to prevent hanging requests
          signal: AbortSignal.timeout(5000)
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const project = await response.json();
          setProjectName(project.title || 'Project');
          setError(null);
        } else {
          if (response.status === 404) {
            setError('Project not found');
          } else {
            console.error('Error fetching project:', await response.text());
            setError('Failed to load project');
          }
          // Keep the generic name if there's an error
          setProjectName('Project');
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching project details:', error);
        setError('Could not connect to server');
        setProjectName('Project');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProjectDetails();
    
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-md mb-4">
          {error}
        </div>
      )}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
} 