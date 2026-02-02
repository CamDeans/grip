'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ProjectNavigation } from '@/components/project/ProjectNavigation'

export default function TestDBPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  
  const [testDbOutput, setTestDbOutput] = useState<any>({ database: null, project: null })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        if (!projectId) {
          throw new Error('Project ID is missing')
        }
        
        const projectResponse = await fetch(`/api/projects/${projectId}`)
        if (!projectResponse.ok) {
          throw new Error(`Project data error: ${projectResponse.status} ${projectResponse.statusText}`)
        }
        const projectData = await projectResponse.json()
        
        // Test the DB connection
        const dbResponse = await fetch('/api/test-db')
        if (!dbResponse.ok) {
          throw new Error(`Database test failed: ${dbResponse.status} ${dbResponse.statusText}`)
        }
        const dbData = await dbResponse.json()
        
        setTestDbOutput({
          database: dbData,
          project: projectData
        })
      } catch (err) {
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [projectId])
  
  if (isLoading) {
    return (
      <div className="p-4">
        <ProjectNavigation />
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin h-10 w-10 border-4 border-primary rounded-full border-t-transparent"></div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-4">
        <ProjectNavigation />
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg mx-auto max-w-2xl mt-8">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-4">
      <ProjectNavigation />
      <h1 className="text-2xl font-bold mb-4">Database Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Database Connection</h2>
        <div className="bg-muted rounded-lg p-4 overflow-auto">
          <pre>{JSON.stringify(testDbOutput?.database, null, 2)}</pre>
        </div>
      </div>
      
      {testDbOutput?.project && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Project Data</h2>
          <div className="bg-muted rounded-lg p-4 overflow-auto">
            <pre>{JSON.stringify(testDbOutput.project, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
} 