'use client'

import { useState, useEffect } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { 
  FolderIcon, 
  FileIcon, 
  SearchIcon,
  RefreshCwIcon,
  DownloadIcon
} from 'lucide-react'

interface FileNode {
  name: string
  type: 'file' | 'directory'
  path: string
  children?: FileNode[]
  size?: number
}

export default function FileExplorerPage() {
  const [rootFiles, setRootFiles] = useState<FileNode[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Mock data for the demo - this would be fetched from an API
    const mockData: FileNode[] = [
      {
        name: 'Project-A',
        type: 'directory',
        path: '/Project-A',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: '/Project-A/src',
            children: [
              { name: 'index.js', type: 'file', path: '/Project-A/src/index.js', size: 1024 },
              { name: 'App.js', type: 'file', path: '/Project-A/src/App.js', size: 2048 }
            ]
          },
          { name: 'package.json', type: 'file', path: '/Project-A/package.json', size: 512 }
        ]
      },
      {
        name: 'Project-B',
        type: 'directory',
        path: '/Project-B',
        children: [
          { name: 'README.md', type: 'file', path: '/Project-B/README.md', size: 256 }
        ]
      }
    ]
    
    setTimeout(() => {
      setRootFiles(mockData)
      setIsLoading(false)
    }, 1000)
  }, [])
  
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">File Explorer</h1>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsLoading(true)
                setTimeout(() => setIsLoading(false), 1000)
              }}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" />
          <Input
            placeholder="Search files..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Generated Project Files</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                <span className="ml-2">Loading files...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-text-secondary py-4">
                  File explorer simplified to avoid recursion issues.
                </p>
                <div className="space-y-2">
                  {rootFiles.map(file => (
                    <div 
                      key={file.path}
                      className="p-2 border rounded-md hover:bg-background-secondary"
                    >
                      <div className="flex items-center">
                        {file.type === 'directory' ? (
                          <FolderIcon className="h-4 w-4 mr-2 text-primary" />
                        ) : (
                          <FileIcon className="h-4 w-4 mr-2 text-text-muted" />
                        )}
                        <span>{file.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboardLayout>
  )
} 