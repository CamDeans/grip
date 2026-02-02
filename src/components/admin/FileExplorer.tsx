/**
 * FileExplorer Component
 * Part of Phase 7, Step 3 of G.R.I.P. AI Assistant Enhancement Plan
 * 
 * Provides a file explorer interface to browse generated project files
 * with directory navigation and syntax highlighting for code files.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderIcon, FileIcon, ChevronRightIcon, ChevronDownIcon, RefreshCwIcon, SearchIcon, FileTextIcon, CodeIcon } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';

// Define file structure types
interface IFile {
  id: string;
  name: string;
  path: string;
  type: 'file';
  extension: string;
  size: number;
  content?: string;
  updatedAt: string;
  createdBy?: string;
}

interface IDirectory {
  id: string;
  name: string;
  path: string;
  type: 'directory';
  children: (IFile | IDirectory)[];
  updatedAt: string;
}

type FileStructureItem = IFile | IDirectory;

interface FileExplorerProps {
  projectId: string;
  initialPath?: string;
  height?: string;
  onFileSelect?: (file: IFile) => void;
}

const getFileIcon = (extension: string) => {
  switch (extension.toLowerCase()) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <CodeIcon className="h-4 w-4 text-yellow-500" />;
    case 'html':
    case 'htm':
      return <CodeIcon className="h-4 w-4 text-accent-amber" />;
    case 'css':
    case 'scss':
    case 'sass':
      return <CodeIcon className="h-4 w-4 text-primary" />;
    case 'json':
      return <CodeIcon className="h-4 w-4 text-success" />;
    case 'md':
      return <FileTextIcon className="h-4 w-4 text-accent-blue" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
};

const getLanguageFromExtension = (extension: string): string => {
  switch (extension.toLowerCase()) {
    case 'js': return 'javascript';
    case 'jsx': return 'jsx';
    case 'ts': return 'typescript';
    case 'tsx': return 'tsx';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'scss': return 'scss';
    case 'sass': return 'sass';
    case 'json': return 'json';
    case 'md': return 'markdown';
    default: return 'text';
  }
};

export function FileExplorer({ 
  projectId, 
  initialPath = '/',
  height = '600px',
  onFileSelect
}: FileExplorerProps) {
  const [fileStructure, setFileStructure] = useState<FileStructureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFile, setSelectedFile] = useState<IFile | null>(null);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('files');
  const { theme } = useTheme();
  
  // Fetch file structure for a project
  const fetchFileStructure = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/project-files?projectId=${projectId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file structure: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFileStructure(data.structure || []);
    } catch (err: any) {
      console.error('Error fetching file structure:', err);
      setError(err.message || 'Failed to load file structure');
      setFileStructure([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch file content
  const fetchFileContent = async (file: IFile) => {
    try {
      setCurrentContent('');
      setSelectedFile(file);
      
      const response = await fetch(`/api/admin/project-files/${file.id}/content`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCurrentContent(data.content || '');
    } catch (err: any) {
      console.error('Error fetching file content:', err);
      setCurrentContent(`Error loading file content: ${err.message}`);
    }
  };
  
  useEffect(() => {
    fetchFileStructure();
  }, [projectId]);
  
  // Toggle directory expansion
  const toggleDirectory = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };
  
  // Handle file selection
  const handleFileSelect = (file: IFile) => {
    fetchFileContent(file);
    if (onFileSelect) onFileSelect(file);
  };
  
  // Render file or directory item
  const renderItem = (item: FileStructureItem, level = 0) => {
    if (item.type === 'directory') {
      const isExpanded = expandedFolders[item.path] || false;
      
      return (
        <div key={item.id}>
          <div 
            className="flex items-center py-1 px-2 hover:bg-background-tertiary cursor-pointer rounded pl-[calc(var(--level)*16px)]"
            style={{ ['--level' as string]: level }}
            onClick={() => toggleDirectory(item.path)}
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 mr-1" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 mr-1" />
            )}
            <FolderIcon className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm">{item.name}</span>
          </div>
          
          {isExpanded && (
            <div className="directory-children">
              {item.children
                .filter(child => searchQuery ? 
                  child.name.toLowerCase().includes(searchQuery.toLowerCase()) : true)
                .sort((a, b) => {
                  // Sort directories first, then files
                  if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                  }
                  // Then sort alphabetically
                  return a.name.localeCompare(b.name);
                })
                .map(child => renderItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    } else {
      // It's a file
      const extension = item.name.split('.').pop() || '';
      const fileIcon = getFileIcon(extension);
      
      return (
        <div 
          key={item.id}
          className={`flex items-center py-1 px-2 hover:bg-background-tertiary cursor-pointer rounded pl-[calc(var(--level)*16px)] ${selectedFile?.id === item.id ? 'bg-primary/10' : ''}`}
          style={{ ['--level' as string]: level }}
          onClick={() => handleFileSelect(item)}
        >
          <div className="w-4 mr-1"></div> {/* Spacing for alignment with folders */}
          {fileIcon}
          <span className="text-sm ml-2">{item.name}</span>
        </div>
      );
    }
  };
  
  // Get a filtered and flattened list of files for search results
  const getFilteredFiles = (items: FileStructureItem[], query: string): IFile[] => {
    const result: IFile[] = [];
    
    const traverse = (items: FileStructureItem[]) => {
      items.forEach(item => {
        if (item.type === 'directory') {
          traverse(item.children);
        } else if (item.name.toLowerCase().includes(query.toLowerCase())) {
          result.push(item);
        }
      });
    };
    
    traverse(items);
    return result;
  };
  
  // Calculate breadcrumb from current path
  const pathParts = currentPath.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const path = '/' + pathParts.slice(0, index + 1).join('/');
    return { name: part, path };
  });
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle>Project Files</CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchFileStructure}
          disabled={isLoading}
        >
          <RefreshCwIcon className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
          
          <div className="mb-4 relative">
            {activeTab === 'search' && (
              <div className="relative">
                <SearchIcon className="h-4 w-4 absolute top-2.5 left-3 text-text-muted" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            
            {activeTab === 'files' && breadcrumbs.length > 0 && (
              <div className="flex items-center text-sm text-text-muted mb-2 overflow-x-auto">
                <span 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentPath('/')}
                >
                  root
                </span>
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={breadcrumb.path}>
                    <ChevronRightIcon className="h-4 w-4 mx-1" />
                    <span 
                      className="cursor-pointer hover:text-primary"
                      onClick={() => setCurrentPath(breadcrumb.path)}
                    >
                      {breadcrumb.name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[400px]" style={{ height }}>
            <TabsContent value="files" className="m-0">
              <Card className="h-full border">
                <CardContent className="p-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-300px)]">
                    {isLoading ? (
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ) : error ? (
                      <div className="p-4 text-destructive">{error}</div>
                    ) : fileStructure.length === 0 ? (
                      <div className="p-4 text-center text-text-muted">
                        No files found for this project.
                      </div>
                    ) : (
                      <div className="p-2">
                        {fileStructure
                          .sort((a, b) => {
                            // Sort directories first, then files
                            if (a.type !== b.type) {
                              return a.type === 'directory' ? -1 : 1;
                            }
                            // Then sort alphabetically
                            return a.name.localeCompare(b.name);
                          })
                          .map(item => renderItem(item))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="search" className="m-0">
              <Card className="h-full border">
                <CardContent className="p-0">
                  <ScrollArea className="h-full max-h-[calc(100vh-300px)]">
                    {searchQuery ? (
                      <div className="p-2">
                        {getFilteredFiles(fileStructure, searchQuery).length > 0 ? (
                          getFilteredFiles(fileStructure, searchQuery).map(file => (
                            <div 
                              key={file.id}
                              className={`flex items-center py-1 px-2 hover:bg-background-tertiary cursor-pointer rounded ${selectedFile?.id === file.id ? 'bg-primary/10' : ''}`}
                              onClick={() => handleFileSelect(file)}
                            >
                              {getFileIcon(file.extension)}
                              <span className="text-sm ml-2">{file.path}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-text-muted">
                            No files found matching &quot;{searchQuery}&quot;.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-text-muted">
                        Enter a search term to find files.
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <Card className="h-full border col-span-1">
              <CardContent className="p-0">
                <ScrollArea className="h-full max-h-[calc(100vh-300px)]">
                  {selectedFile ? (
                    <div className="p-2">
                      <div className="bg-background-tertiary p-2 mb-2 rounded flex justify-between items-center">
                        <div className="flex items-center">
                          {getFileIcon(selectedFile.extension)}
                          <span className="ml-2 font-medium">{selectedFile.name}</span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {Math.round(selectedFile.size / 1024 * 10) / 10} KB
                        </span>
                      </div>
                      
                      <SyntaxHighlighter
                        language={getLanguageFromExtension(selectedFile.extension)}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          minHeight: '100px'
                        }}
                      >
                        {currentContent}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-text-muted">
                      Select a file to view its content
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
} 