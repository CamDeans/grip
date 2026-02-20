'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { BackAndDashboardNav } from '@/components/layout/BackAndDashboardNav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui'
import { CopyIcon, CodeIcon, CheckIcon, ChevronDownIcon } from 'lucide-react'

export default function ApiDocumentationPage() {
  const [activeSection, setActiveSection] = useState<string>('projects')
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)

  const handleCopy = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    {
      category: 'projects',
      title: 'Projects API',
      description: 'Manage projects within the G.R.I.P. platform',
      endpoints: [
        {
          id: 'get-projects',
          method: 'GET',
          path: '/api/projects',
          description: 'Retrieve all projects for the authenticated user',
          responseType: 'application/json',
          responseExample: `{
  "projects": [
    {
      "_id": "project_123456",
      "title": "E-commerce Platform",
      "description": "Modern online store with advanced features",
      "status": "active",
      "createdAt": "2023-11-15T12:00:00Z",
      "updatedAt": "2023-11-18T09:30:00Z",
      "repository": {
        "owner": "username",
        "name": "e-commerce-repo"
      }
    }
  ]
}`
        },
        {
          id: 'create-project',
          method: 'POST',
          path: '/api/projects',
          description: 'Create a new project',
          requestType: 'application/json',
          requestExample: `{
  "title": "Task Management App",
  "description": "A modern task management application with team collaboration features",
  "repository": {
    "owner": "username",
    "name": "task-manager"
  },
  "ideation": {
    "goals": "Create an intuitive task management system",
    "targetAudience": "Small to medium-sized teams",
    "keyFeatures": "Task assignment, priority setting, due dates, team chat",
    "technicalRequirements": "React, NextJS, MongoDB"
  }
}`,
          responseType: 'application/json',
          responseExample: `{
  "project": {
    "_id": "project_987654",
    "title": "Task Management App",
    "description": "A modern task management application with team collaboration features",
    "status": "active",
    "createdAt": "2023-12-05T15:22:10Z",
    "repository": {
      "owner": "username",
      "name": "task-manager"
    }
  }
}`
        },
        {
          id: 'get-project',
          method: 'GET',
          path: '/api/projects/{id}',
          description: 'Retrieve a specific project by ID',
          pathParams: [
            {
              name: 'id',
              type: 'string',
              description: 'The project ID'
            }
          ],
          responseType: 'application/json',
          responseExample: `{
  "project": {
    "_id": "project_123456",
    "title": "E-commerce Platform",
    "description": "Modern online store with advanced features",
    "status": "active",
    "createdAt": "2023-11-15T12:00:00Z",
    "updatedAt": "2023-11-18T09:30:00Z",
    "repository": {
      "owner": "username",
      "name": "e-commerce-repo"
    }
  }
}`
        }
      ]
    },
    {
      category: 'ai',
      title: 'AI API',
      description: 'AI-powered utilities for enhancing development workflows',
      endpoints: [
        {
          id: 'generate-keywords',
          method: 'POST',
          path: '/api/ai/generate-keywords',
          description: 'Generate relevant keywords based on project information',
          requestType: 'application/json',
          requestExample: `{
  "title": "E-commerce Dashboard",
  "description": "Admin dashboard for managing an online store with product management, orders, and customer analytics"
}`,
          responseType: 'application/json',
          responseExample: `{
  "keywords": [
    "ecommerce",
    "dashboard",
    "admin-panel",
    "react",
    "analytics"
  ]
}`
        }
      ]
    },
    {
      category: 'files',
      title: 'Files API',
      description: 'Access and manage project files',
      endpoints: [
        {
          id: 'get-project-files',
          method: 'GET',
          path: '/api/projects/{id}/files',
          description: 'Retrieve all files for a specific project',
          pathParams: [
            {
              name: 'id',
              type: 'string',
              description: 'The project ID'
            }
          ],
          queryParams: [
            {
              name: 'path',
              type: 'string',
              description: 'Optional directory path to filter files',
              required: false
            }
          ],
          responseType: 'application/json',
          responseExample: `{
  "files": [
    {
      "_id": "file_123",
      "projectId": "project_123456",
      "path": "/src/components/App.jsx",
      "content": "import React from 'react'...",
      "language": "jsx",
      "createdAt": "2023-11-16T10:20:00Z",
      "updatedAt": "2023-11-17T08:15:00Z"
    }
  ]
}`
        },
        {
          id: 'get-file-content',
          method: 'GET',
          path: '/api/projects/{projectId}/files/{fileId}',
          description: 'Retrieve content of a specific file',
          pathParams: [
            {
              name: 'projectId',
              type: 'string',
              description: 'The project ID'
            },
            {
              name: 'fileId',
              type: 'string',
              description: 'The file ID'
            }
          ],
          responseType: 'application/json',
          responseExample: `{
  "file": {
    "_id": "file_123",
    "projectId": "project_123456",
    "path": "/src/components/App.jsx",
    "content": "import React from 'react'...",
    "language": "jsx",
    "createdAt": "2023-11-16T10:20:00Z",
    "updatedAt": "2023-11-17T08:15:00Z"
  }
}`
        }
      ]
    },
    {
      category: 'chat',
      title: 'Chat API',
      description: 'Manage chat sessions and messages',
      endpoints: [
        {
          id: 'enhanced-chat',
          method: 'POST',
          path: '/api/enhanced-chat',
          description: 'Send a message to G.R.I.P. AI assistant with project context',
          requestType: 'application/json',
          requestExample: `{
  "projectId": "project_123456",
  "message": "How do I implement the user authentication feature?",
  "context": {
    "previousMessages": [
      {
        "role": "user",
        "content": "I want to add user login to my app"
      },
      {
        "role": "assistant",
        "content": "I recommend using NextAuth.js for authentication in your Next.js application"
      }
    ]
  }
}`,
          responseType: 'application/json',
          responseExample: `{
  "response": {
    "id": "msg_123456",
    "role": "assistant",
    "content": "To implement user authentication in your project, follow these steps:...",
    "createdAt": "2023-12-05T15:30:22Z"
  },
  "projectContext": {
    "relevantFiles": ["src/pages/api/auth/[...nextauth].js", "src/components/LoginForm.jsx"]
  }
}`
        }
      ]
    },
    {
      category: 'support',
      title: 'Support API',
      description: 'Create and manage support tickets',
      endpoints: [
        {
          id: 'create-ticket',
          method: 'POST',
          path: '/api/support/tickets',
          description: 'Create a support ticket (public). Sends email notification to support if Resend is configured.',
          requestType: 'application/json',
          requestExample: `{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Domain setup help",
  "message": "I need help connecting my custom domain.",
  "domain": "app.myapp.com"
}`,
          responseType: 'application/json',
          responseExample: `{
  "success": true,
  "ticketId": "abc123",
  "message": "Support ticket created. We will get back to you soon."
}`
        },
        {
          id: 'list-tickets',
          method: 'GET',
          path: '/api/support/tickets',
          description: 'List support tickets (admin-only). Use ?status=open or ?limit=50.',
          responseType: 'application/json',
          responseExample: `{
  "tickets": [
    {
      "_id": "...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "subject": "Domain setup help",
      "message": "...",
      "domain": "app.myapp.com",
      "status": "open",
      "createdAt": "2024-01-15T12:00:00Z"
    }
  ]
}`
        }
      ]
    },
    {
      category: 'analytics',
      title: 'Analytics API',
      description: 'Access project and user analytics',
      endpoints: [
        {
          id: 'get-analytics',
          method: 'GET',
          path: '/api/analytics',
          description: 'Retrieve analytics data for projects and development metrics',
          queryParams: [
            {
              name: 'timeframe',
              type: 'string',
              description: 'Time period for analytics (e.g., "7d", "30d", "24h")',
              required: false,
              default: '7d'
            }
          ],
          responseType: 'application/json',
          responseExample: `{
  "totalProjects": 12,
  "projectGrowth": {
    "percentage": 25,
    "direction": "up"
  },
  "activityData": [
    { "date": "2023-11-29", "count": 5 },
    { "date": "2023-11-30", "count": 8 }
  ],
  "buildData": [
    { "status": "success", "count": 24 },
    { "status": "failed", "count": 3 }
  ],
  "languageData": [
    { "language": "JavaScript", "percentage": 45 },
    { "language": "TypeScript", "percentage": 30 },
    { "language": "CSS", "percentage": 15 },
    { "language": "HTML", "percentage": 10 }
  ]
}`
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader 
        title="API Reference" 
        description="All G.R.I.P. API endpoints used by the dashboard and available to integrators"
      />

      <div className="rounded-lg border border-border bg-background-secondary p-4 text-sm text-text-primary">
        <p className="font-medium mb-2">What this page is for</p>
        <p>The G.R.I.P. dashboard uses these APIs for projects, chat, files, AI (e.g. keyword generation), support tickets, and analytics. If you are integrating a custom client or another tool, use the same endpoints with session-based authentication (cookies). All requests require an authenticated session; unauthenticated requests receive 401. Rate limits apply to sensitive operations. See the Authentication section at the bottom for credentials and error formats.</p>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          {endpoints.map((section) => (
            <TabsTrigger key={section.category} value={section.category}>
              {section.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-12">
        {endpoints
          .filter((section) => section.category === activeSection)
          .map((section) => (
            <div key={section.category} className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">{section.title}</h2>
                <p className="text-text-secondary mt-1">{section.description}</p>
              </div>

              <div className="space-y-6">
                {section.endpoints.map((endpoint) => (
                  <Card key={endpoint.id} id={endpoint.id} className="overflow-hidden">
                    <CardHeader className="bg-background-secondary">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            endpoint.method === 'GET' 
                              ? 'bg-primary/10 text-primary' 
                              : endpoint.method === 'POST'
                              ? 'bg-success/10 text-success'
                              : endpoint.method === 'PUT'
                              ? 'bg-accent-amber/10 text-accent-amber'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {endpoint.method}
                          </span>
                          <CardTitle className="text-xl font-bold font-mono">{endpoint.path}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(endpoint.path, endpoint.id)}
                          className="flex items-center space-x-1"
                        >
                          {copiedEndpoint === endpoint.id ? (
                            <CheckIcon className="h-4 w-4 text-success" />
                          ) : (
                            <CopyIcon className="h-4 w-4" />
                          )}
                          <span>{copiedEndpoint === endpoint.id ? 'Copied!' : 'Copy'}</span>
                        </Button>
                      </div>
                      <CardDescription>{endpoint.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-6 pt-6">
                      {/* Parameters Section */}
                      {(endpoint.pathParams || endpoint.queryParams) && (
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold">Parameters</h3>
                          
                          {endpoint.pathParams && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-text-secondary">Path Parameters</h4>
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-background-secondary">
                                    <th className="py-2 px-4 text-left font-medium">Name</th>
                                    <th className="py-2 px-4 text-left font-medium">Type</th>
                                    <th className="py-2 px-4 text-left font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.pathParams.map((param) => (
                                    <tr key={param.name} className="border-t border-border">
                                      <td className="py-2 px-4 font-mono">{param.name}</td>
                                      <td className="py-2 px-4">{param.type}</td>
                                      <td className="py-2 px-4">{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          
                          {endpoint.queryParams && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-text-secondary">Query Parameters</h4>
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-background-secondary">
                                    <th className="py-2 px-4 text-left font-medium">Name</th>
                                    <th className="py-2 px-4 text-left font-medium">Type</th>
                                    <th className="py-2 px-4 text-left font-medium">Required</th>
                                    <th className="py-2 px-4 text-left font-medium">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {endpoint.queryParams.map((param) => (
                                    <tr key={param.name} className="border-t border-border">
                                      <td className="py-2 px-4 font-mono">{param.name}</td>
                                      <td className="py-2 px-4">{param.type}</td>
                                      <td className="py-2 px-4">{param.required === false ? 'No' : 'Yes'}</td>
                                      <td className="py-2 px-4">{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Request Example */}
                      {endpoint.requestExample && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Request</h3>
                            <div className="text-sm text-text-secondary">
                              {endpoint.requestType || 'application/json'}
                            </div>
                          </div>
                          <div className="relative">
                            <pre className="bg-background-tertiary p-4 rounded-md overflow-x-auto">
                              <code className="text-sm text-text-primary font-mono whitespace-pre">
                                {endpoint.requestExample}
                              </code>
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => handleCopy(endpoint.requestExample, `${endpoint.id}-req`)}
                            >
                              {copiedEndpoint === `${endpoint.id}-req` ? 
                                <CheckIcon className="h-4 w-4 text-success" /> : 
                                <CopyIcon className="h-4 w-4" />
                              }
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Response Example */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Response</h3>
                          <div className="text-sm text-text-secondary">
                            {endpoint.responseType || 'application/json'}
                          </div>
                        </div>
                        <div className="relative">
                          <pre className="bg-background-tertiary p-4 rounded-md overflow-x-auto">
                            <code className="text-sm text-text-primary font-mono whitespace-pre">
                              {endpoint.responseExample}
                            </code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopy(endpoint.responseExample, `${endpoint.id}-res`)}
                          >
                            {copiedEndpoint === `${endpoint.id}-res` ? 
                              <CheckIcon className="h-4 w-4 text-success" /> : 
                              <CopyIcon className="h-4 w-4" />
                            }
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        }
      </div>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            All API requests require authentication. G.R.I.P. uses Next-Auth for session management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Authentication is handled via cookies set by Next-Auth. When using the API from your application,
            ensure that you include credentials in your fetch requests:
          </p>
          <pre className="bg-background-tertiary p-4 rounded-md overflow-x-auto">
            <code className="text-sm text-text-primary font-mono">
{`fetch('/api/projects', {
  method: 'GET',
  credentials: 'include'
})`}
            </code>
          </pre>
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Error Responses</h3>
            <p className="mb-2">All API endpoints return consistent error formats:</p>
            <pre className="bg-background-tertiary p-4 rounded-md overflow-x-auto">
              <code className="text-sm text-text-primary font-mono">
{`{
  "error": "Error message",
  "details": "Optional additional error details"
}`}
              </code>
            </pre>
          </div>
        </CardContent>
      </Card>

      <BackAndDashboardNav backFallbackHref="/docs" backLabel="Back to Docs" />
    </div>
  );
} 