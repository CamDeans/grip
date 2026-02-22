'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Code, Check, RefreshCw } from 'lucide-react'
import { refreshTokenUsage } from '@/lib/tokenRefresh'

interface CodeGeneratorProps {
  projectId: string
}

export function CodeGenerator({ projectId }: CodeGeneratorProps) {
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [filePath, setFilePath] = useState<string>('')
  const [filename, setFilename] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [variables, setVariables] = useState<Record<string, any>>({})
  const [projectStructure, setProjectStructure] = useState<any>(null)
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('generate')

  // Fetch templates and project structure on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, structureRes, filesRes] = await Promise.all([
          fetch(`/api/templates?projectId=${projectId}`),
          fetch(`/api/projects/${projectId}/structure`),
          fetch(`/api/projects/${projectId}/files`)
        ])

        if (templatesRes.ok && structureRes.ok && filesRes.ok) {
          const templatesData = await templatesRes.json()
          const structureData = await structureRes.json()
          const filesData = await filesRes.json()
          
          setTemplates(templatesData.templates)
          setProjectStructure(structureData.structure)
          setGeneratedFiles(filesData.files)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        alert('Failed to load templates and project structure')
      }
    }

    fetchData()
  }, [projectId])

  // Fetch template details when selected
  useEffect(() => {
    if (selectedTemplateId) {
      const selected = templates.find(t => t.id === selectedTemplateId)
      setSelectedTemplate(selected)
      
      if (selected) {
        // Initialize variables with default values
        const initialVariables: Record<string, any> = {}
        selected.variables.forEach((variable: string) => {
          initialVariables[variable] = selected.defaultValues?.[variable] || ''
        })
        setVariables(initialVariables)
      }
    }
  }, [selectedTemplateId, templates])

  const handleGenerateFile = async () => {
    if (!selectedTemplateId || !filePath) {
      alert('Please select a template and specify a file path')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/files/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          templateId: selectedTemplateId,
          filePath,
          filename: filename || undefined,
          description,
          variables
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add the new file to the list
        setGeneratedFiles(prev => {
          const exists = prev.some(file => file.fileId === data.fileId)
          return exists ? prev.map(file => file.fileId === data.fileId ? data : file) : [...prev, data]
        })
        
        refreshTokenUsage()
        alert('File generated successfully')
        
        // Reset form
        setFilename('')
        setDescription('')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate file')
      }
    } catch (error) {
      console.error('Error generating file:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVariableChange = (name: string, value: any) => {
    setVariables(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const refreshFiles = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files`)
      if (response.ok) {
        const data = await response.json()
        setGeneratedFiles(data.files)
      }
    } catch (error) {
      console.error('Error refreshing files:', error)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Code Generator</CardTitle>
        <CardDescription>Generate code files for your project using templates</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Files</TabsTrigger>
            <TabsTrigger value="files">Generated Files</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Template</div>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Built-In Templates</SelectLabel>
                        {templates
                          .filter(t => t.isBuiltIn)
                          .map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} - {template.description}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Custom Templates</SelectLabel>
                        {templates
                          .filter(t => !t.isBuiltIn)
                          .map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} - {template.description}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">File Path</div>
                  <Input
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="e.g., src/components/MyComponent"
                  />
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">Filename (Optional)</div>
                  <Input
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="e.g., MyComponent.tsx (leave empty for auto-generation)"
                  />
                </div>
                
                <div>
                  <div className="text-sm font-medium mb-2">Description</div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the purpose of this file"
                    rows={3}
                    className="w-full border rounded-md p-2"
                  />
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Template Variables</div>
                {!selectedTemplate ? (
                  <div className="text-sm text-muted">
                    Select a template to configure variables
                  </div>
                ) : selectedTemplate.variables.length === 0 ? (
                  <div className="text-sm text-muted">
                    This template has no configurable variables
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    <div className="space-y-4">
                      {selectedTemplate.variables.map((variable: string) => (
                        <div key={variable}>
                          <div className="text-sm font-medium mb-1">{variable}</div>
                          <Input
                            value={variables[variable] || ''}
                            onChange={(e) => handleVariableChange(variable, e.target.value)}
                            placeholder={`Enter value for ${variable}`}
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="files" className="pt-4">
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFiles}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
            
            {generatedFiles.length === 0 ? (
              <div className="text-center py-8 text-muted">
                No files have been generated yet
              </div>
            ) : (
              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-4 space-y-2">
                  {generatedFiles.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{file.path}/{file.filename}</div>
                        <div className="text-xs text-muted">
                          {file.language} · {(file.size / 1024).toFixed(2)}KB · v{file.version}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <a href={`/dashboard/projects/${projectId}#generated-files`} className="inline-flex items-center" aria-label="View file in project">
                          <Code className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {activeTab === 'generate' && (
        <CardFooter className="border-t pt-4">
          <Button 
            onClick={handleGenerateFile} 
            disabled={isLoading || !selectedTemplateId || !filePath}
            className="gap-2"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Generate File
          </Button>
        </CardFooter>
      )}
    </Card>
  )
} 