# G.R.I.P. API Reference

This document provides detailed information about the G.R.I.P. API endpoints, their parameters, and response formats.

## Base URL

All API endpoints are relative to the base URL of your G.R.I.P. installation:

```
https://your-grip-installation.com/api
```

For local development, the base URL is:

```
http://localhost:3000/api
```

## Authentication

All API requests require authentication. G.R.I.P. uses NextAuth for authentication, which sets an HTTP-only cookie for session management.

## Project API

### List Projects

Retrieves a list of all projects accessible to the current user.

**Endpoint:** `GET /projects`

**Query Parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| limit     | number | Maximum number of projects to return (default: 10) |
| offset    | number | Offset for pagination (default: 0) |
| status    | string | Filter by project status ('active', 'archived', 'completed') |

**Response:**

```json
{
  "projects": [
    {
      "id": "6507f321a9b2e7d3c3b8f4a1",
      "title": "Example Project",
      "description": "This is an example project",
      "status": "active",
      "createdAt": "2023-01-01T12:00:00.000Z",
      "updatedAt": "2023-01-02T12:00:00.000Z"
    },
    ...
  ],
  "total": 25
}
```

### Get Project

Retrieves detailed information about a specific project.

**Endpoint:** `GET /projects/:id`

**Path Parameters:**

| Parameter | Type   | Description     |
|-----------|--------|-----------------|
| id        | string | Project ID      |

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4a1",
  "title": "Example Project",
  "description": "This is an example project",
  "repositoryUrl": "https://github.com/example/repo",
  "status": "active",
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-02T12:00:00.000Z",
  "ideation": {
    "goals": "Build a web application",
    "targetAudience": "Developers",
    "keyFeatures": "API integration, user management",
    "technicalRequirements": "React, Node.js, MongoDB"
  }
}
```

### Create Project

Creates a new project.

**Endpoint:** `POST /projects`

**Request Body:**

```json
{
  "title": "New Project",
  "description": "Description of the new project",
  "repositoryUrl": "https://github.com/example/repo",
  "ideation": {
    "goals": "Build a web application",
    "targetAudience": "Developers",
    "keyFeatures": "API integration, user management",
    "technicalRequirements": "React, Node.js, MongoDB"
  }
}
```

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4a1",
  "title": "New Project",
  "description": "Description of the new project",
  "repositoryUrl": "https://github.com/example/repo",
  "status": "active",
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-01T12:00:00.000Z",
  "ideation": {
    "goals": "Build a web application",
    "targetAudience": "Developers",
    "keyFeatures": "API integration, user management",
    "technicalRequirements": "React, Node.js, MongoDB"
  }
}
```

### Update Project

Updates an existing project.

**Endpoint:** `PUT /projects/:id`

**Path Parameters:**

| Parameter | Type   | Description     |
|-----------|--------|-----------------|
| id        | string | Project ID      |

**Request Body:**

```json
{
  "title": "Updated Project Title",
  "description": "Updated project description",
  "status": "completed",
  "ideation": {
    "goals": "Updated goals",
    "targetAudience": "Updated target audience",
    "keyFeatures": "Updated key features",
    "technicalRequirements": "Updated technical requirements"
  }
}
```

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4a1",
  "title": "Updated Project Title",
  "description": "Updated project description",
  "repositoryUrl": "https://github.com/example/repo",
  "status": "completed",
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-02T12:00:00.000Z",
  "ideation": {
    "goals": "Updated goals",
    "targetAudience": "Updated target audience",
    "keyFeatures": "Updated key features",
    "technicalRequirements": "Updated technical requirements"
  }
}
```

### Delete Project

Deletes a project.

**Endpoint:** `DELETE /projects/:id`

**Path Parameters:**

| Parameter | Type   | Description     |
|-----------|--------|-----------------|
| id        | string | Project ID      |

**Response:**

```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

## Analysis API

### Get Project Analysis

Retrieves the analysis for a specific project.

**Endpoint:** `GET /analysis/:projectId`

**Path Parameters:**

| Parameter  | Type   | Description     |
|------------|--------|-----------------|
| projectId  | string | Project ID      |

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4a2",
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "repositoryStructure": {
    "files": [
      {
        "path": "/src/index.js",
        "type": "file",
        "language": "javascript"
      }
    ],
    "totalFiles": 42,
    "languages": {
      "javascript": 70,
      "typescript": 20,
      "css": 10
    }
  },
  "codeStructure": {
    "fileCount": 42,
    "directoryStructure": [
      "src",
      "src/components",
      "src/utils"
    ],
    "mainLanguages": {
      "javascript": 70,
      "typescript": 20,
      "css": 10
    },
    "components": [
      "App",
      "Header",
      "Footer"
    ],
    "features": [
      "Authentication",
      "User Management",
      "API Integration"
    ]
  },
  "recommendations": [
    "Add TypeScript for better type safety",
    "Implement unit tests for components",
    "Use React Context API for state management"
  ],
  "status": "completed",
  "timestamp": "2023-01-01T12:00:00.000Z"
}
```

### Trigger Repository Analysis

Triggers an analysis for a project repository.

**Endpoint:** `POST /projects/:id/analyze`

**Path Parameters:**

| Parameter | Type   | Description     |
|-----------|--------|-----------------|
| id        | string | Project ID      |

**Request Body:**

```json
{
  "forceReanalysis": true
}
```

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4a2",
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "status": "in_progress",
  "message": "Analysis started",
  "timestamp": "2023-01-01T12:00:00.000Z"
}
```

## Chat API

### Get Chat History

Retrieves the chat history for a project.

**Endpoint:** `GET /chat/history`

**Query Parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| projectId | string | Project ID                     |
| limit     | number | Maximum number of messages to return (default: 50) |
| before    | string | Timestamp for pagination (messages before this time) |

**Response:**

```json
{
  "messages": [
    {
      "id": "6507f321a9b2e7d3c3b8f4a3",
      "role": "user",
      "content": "How do I start the project?",
      "timestamp": "2023-01-01T12:00:00.000Z"
    },
    {
      "id": "6507f321a9b2e7d3c3b8f4a4",
      "role": "assistant",
      "content": "To start the project, you'll need to run `npm install` followed by `npm start`.",
      "timestamp": "2023-01-01T12:01:00.000Z",
      "stepContext": {
        "phase": "Development Environment Setup",
        "stepId": 1,
        "action": {
          "type": "response",
          "status": "completed",
          "message": "Response provided"
        }
      }
    }
  ]
}
```

### Send Chat Message

Sends a chat message.

**Endpoint:** `POST /chat`

**Request Body:**

```json
{
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "message": "How do I implement authentication?",
  "currentPhase": "Development Environment Setup",
  "phases": [
    {
      "name": "Development Environment Setup",
      "steps": [
        {
          "id": 1,
          "title": "Setup Project",
          "status": "completed"
        },
        {
          "id": 2,
          "title": "Install Dependencies",
          "status": "pending"
        }
      ]
    }
  ]
}
```

**Response:**

```json
{
  "content": "To implement authentication, you can use NextAuth.js. First, install it with `npm install next-auth`. Then, create a configuration file at `pages/api/auth/[...nextauth].js`.",
  "stepContext": {
    "phase": "Development Environment Setup",
    "stepId": 2,
    "action": {
      "type": "response",
      "status": "completed",
      "message": "AI response generated"
    }
  }
}
```

### Send Enhanced Chat Message

Sends a chat message with project context.

**Endpoint:** `POST /enhanced-chat`

**Request Body:**

```json
{
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "message": "Generate a React component for the user profile page",
  "context": {
    "project": {
      "id": "6507f321a9b2e7d3c3b8f4a1",
      "title": "Example Project",
      "description": "This is an example project",
      "technicalRequirements": "React, TypeScript, Tailwind CSS"
    },
    "analysis": {
      "codeStructure": {
        "components": ["Header", "Footer", "Button"],
        "mainLanguages": { "typescript": 80, "css": 20 }
      }
    },
    "files": [
      {
        "id": "6507f321a9b2e7d3c3b8f4b1",
        "path": "/src/components",
        "filename": "Button.tsx",
        "language": "typescript",
        "content": "export function Button({ children }) { return <button>{children}</button>; }"
      }
    ]
  }
}
```

**Response:**

```json
{
  "message": "Here's a React component for the user profile page using TypeScript and Tailwind CSS:\n\n```tsx\nimport React from 'react';\nimport { Button } from './Button';\n\ninterface UserProfileProps {\n  username: string;\n  email: string;\n  avatar?: string;\n}\n\nexport function UserProfile({ username, email, avatar }: UserProfileProps) {\n  return (\n    <div className=\"p-4 bg-white rounded-lg shadow\">\n      <div className=\"flex items-center space-x-4\">\n        <img\n          src={avatar || '/default-avatar.png'}\n          alt={`${username}'s avatar`}\n          className=\"w-16 h-16 rounded-full\"\n        />\n        <div>\n          <h2 className=\"text-xl font-bold\">{username}</h2>\n          <p className=\"text-gray-600\">{email}</p>\n        </div>\n      </div>\n      <div className=\"mt-4\">\n        <Button>Edit Profile</Button>\n      </div>\n    </div>\n  );\n}\n```",
  "stepContext": {
    "phase": "Development",
    "stepId": 1,
    "action": {
      "type": "code_generation",
      "status": "completed",
      "message": "Component generated"
    }
  },
  "refreshContext": true
}
```

## File API

### List Project Files

Lists files for a project.

**Endpoint:** `GET /project-files/list`

**Query Parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| projectId | string | Project ID                     |
| limit     | number | Maximum number of files to return (default: 10) |
| offset    | number | Offset for pagination (default: 0) |
| path      | string | Filter by path                 |
| language  | string | Filter by language             |

**Response:**

```json
{
  "files": [
    {
      "id": "6507f321a9b2e7d3c3b8f4b1",
      "projectId": "6507f321a9b2e7d3c3b8f4a1",
      "path": "/src/components",
      "filename": "Button.tsx",
      "language": "typescript",
      "version": 1,
      "createdAt": "2023-01-01T12:00:00.000Z",
      "updatedAt": "2023-01-01T12:00:00.000Z"
    },
    {
      "id": "6507f321a9b2e7d3c3b8f4b2",
      "projectId": "6507f321a9b2e7d3c3b8f4a1",
      "path": "/src/components",
      "filename": "Header.tsx",
      "language": "typescript",
      "version": 1,
      "createdAt": "2023-01-01T12:00:00.000Z",
      "updatedAt": "2023-01-01T12:00:00.000Z"
    }
  ],
  "total": 42
}
```

### Get File Details

Retrieves details and content of a specific file.

**Endpoint:** `GET /project-files/:id`

**Path Parameters:**

| Parameter | Type   | Description  |
|-----------|--------|--------------|
| id        | string | File ID      |

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4b1",
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "path": "/src/components",
  "filename": "Button.tsx",
  "content": "export function Button({ children }) { return <button>{children}</button>; }",
  "language": "typescript",
  "version": 1,
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-01T12:00:00.000Z"
}
```

### Create File

Creates a new file.

**Endpoint:** `POST /project-files`

**Request Body:**

```json
{
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "path": "/src/components",
  "filename": "Footer.tsx",
  "content": "export function Footer() { return <footer>Footer</footer>; }",
  "language": "typescript"
}
```

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4b3",
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "path": "/src/components",
  "filename": "Footer.tsx",
  "content": "export function Footer() { return <footer>Footer</footer>; }",
  "language": "typescript",
  "version": 1,
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-01T12:00:00.000Z"
}
```

### Update File

Updates an existing file.

**Endpoint:** `PUT /project-files/:id`

**Path Parameters:**

| Parameter | Type   | Description  |
|-----------|--------|--------------|
| id        | string | File ID      |

**Request Body:**

```json
{
  "content": "export function Footer() { return <footer>Updated Footer</footer>; }"
}
```

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4b3",
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "path": "/src/components",
  "filename": "Footer.tsx",
  "content": "export function Footer() { return <footer>Updated Footer</footer>; }",
  "language": "typescript",
  "version": 2,
  "createdAt": "2023-01-01T12:00:00.000Z",
  "updatedAt": "2023-01-02T12:00:00.000Z"
}
```

### Delete File

Deletes a file.

**Endpoint:** `DELETE /project-files/:id`

**Path Parameters:**

| Parameter | Type   | Description  |
|-----------|--------|--------------|
| id        | string | File ID      |

**Response:**

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Build API

### Get Build Logs

Retrieves build logs for a project.

**Endpoint:** `GET /build-logs/:projectId`

**Path Parameters:**

| Parameter  | Type   | Description  |
|------------|--------|--------------|
| projectId  | string | Project ID   |

**Query Parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| limit     | number | Maximum number of logs to return (default: 10) |
| offset    | number | Offset for pagination (default: 0) |
| status    | string | Filter by status ('pending', 'in_progress', 'completed', 'failed', 'cancelled') |

**Response:**

```json
{
  "logs": [
    {
      "id": "6507f321a9b2e7d3c3b8f4c1",
      "projectId": "6507f321a9b2e7d3c3b8f4a1",
      "taskType": "build",
      "command": "npm run build",
      "status": "completed",
      "output": "Build completed successfully",
      "startTime": "2023-01-01T12:00:00.000Z",
      "endTime": "2023-01-01T12:01:00.000Z"
    },
    {
      "id": "6507f321a9b2e7d3c3b8f4c2",
      "projectId": "6507f321a9b2e7d3c3b8f4a1",
      "taskType": "test",
      "command": "npm test",
      "status": "failed",
      "output": "Tests failed: 2 of 10 tests failed",
      "startTime": "2023-01-01T12:10:00.000Z",
      "endTime": "2023-01-01T12:11:00.000Z"
    }
  ],
  "total": 5
}
```

### Trigger Build

Triggers a build for a project.

**Endpoint:** `POST /projects/:id/build`

**Path Parameters:**

| Parameter | Type   | Description  |
|-----------|--------|--------------|
| id        | string | Project ID   |

**Request Body:**

```json
{
  "type": "production",
  "commands": [
    "npm install",
    "npm run build",
    "npm test"
  ]
}
```

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4c3",
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "taskType": "build",
  "status": "in_progress",
  "message": "Build started",
  "startTime": "2023-01-01T12:00:00.000Z"
}
```

### List All Builds

Lists all builds for admin management.

**Endpoint:** `GET /admin/builds`

**Query Parameters:**

| Parameter  | Type   | Description                    |
|------------|--------|--------------------------------|
| projectId  | string | Filter by project ID (optional) |
| status     | string | Filter by status ('pending', 'in_progress', 'completed', 'failed', 'cancelled') |
| limit      | number | Maximum number of builds to return (default: 10) |
| offset     | number | Offset for pagination (default: 0) |

**Response:**

```json
{
  "builds": [
    {
      "id": "6507f321a9b2e7d3c3b8f4c1",
      "projectId": "6507f321a9b2e7d3c3b8f4a1",
      "projectTitle": "Example Project",
      "taskType": "build",
      "status": "completed",
      "startTime": "2023-01-01T12:00:00.000Z",
      "endTime": "2023-01-01T12:01:00.000Z",
      "logs": [
        {
          "level": "info",
          "message": "Build started",
          "timestamp": "2023-01-01T12:00:00.000Z"
        },
        {
          "level": "success",
          "message": "Build completed",
          "timestamp": "2023-01-01T12:01:00.000Z"
        }
      ]
    }
  ],
  "total": 25
}
```

### Stop Build

Stops a running build.

**Endpoint:** `POST /admin/builds/:id/stop`

**Path Parameters:**

| Parameter | Type   | Description |
|-----------|--------|-------------|
| id        | string | Build ID    |

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4c1",
  "status": "cancelled",
  "message": "Build stopped by user",
  "endTime": "2023-01-01T12:00:30.000Z"
}
```

## Terminal API

### Execute Command

Executes a terminal command.

**Endpoint:** `POST /terminal/execute`

**Request Body:**

```json
{
  "sessionId": "6507f321a9b2e7d3c3b8f4d1",
  "command": "ls -la",
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "workingDirectory": "/src"
}
```

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4d2",
  "command": "ls -la",
  "output": "total 16\ndrwxr-xr-x  4 user user 4096 Jan  1 12:00 .\ndrwxr-xr-x  8 user user 4096 Jan  1 12:00 ..\ndrwxr-xr-x  2 user user 4096 Jan  1 12:00 components\n-rw-r--r--  1 user user  512 Jan  1 12:00 index.js",
  "exitCode": 0,
  "timestamp": "2023-01-01T12:00:00.000Z"
}
```

### Get Terminal History

Retrieves the command history for a terminal session.

**Endpoint:** `GET /terminal/:id/history`

**Path Parameters:**

| Parameter | Type   | Description    |
|-----------|--------|----------------|
| id        | string | Terminal ID    |

**Query Parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| limit     | number | Maximum number of commands to return (default: 20) |
| before    | string | Timestamp for pagination (commands before this time) |

**Response:**

```json
{
  "commands": [
    {
      "id": "6507f321a9b2e7d3c3b8f4d2",
      "command": "ls -la",
      "output": "total 16\ndrwxr-xr-x  4 user user 4096 Jan  1 12:00 .\ndrwxr-xr-x  8 user user 4096 Jan  1 12:00 ..\ndrwxr-xr-x  2 user user 4096 Jan  1 12:00 components\n-rw-r--r--  1 user user  512 Jan  1 12:00 index.js",
      "exitCode": 0,
      "timestamp": "2023-01-01T12:00:00.000Z"
    },
    {
      "id": "6507f321a9b2e7d3c3b8f4d3",
      "command": "pwd",
      "output": "/src",
      "exitCode": 0,
      "timestamp": "2023-01-01T12:01:00.000Z"
    }
  ],
  "currentDirectory": "/src"
}
```

### Create Terminal Session

Creates a new terminal session.

**Endpoint:** `POST /terminal/create`

**Request Body:**

```json
{
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "initialDirectory": "/"
}
```

**Response:**

```json
{
  "id": "6507f321a9b2e7d3c3b8f4d1",
  "projectId": "6507f321a9b2e7d3c3b8f4a1",
  "status": "active",
  "currentDirectory": "/",
  "createdAt": "2023-01-01T12:00:00.000Z"
}
```

## Error Handling

All API endpoints use standard HTTP status codes and return consistent error formats.

### Error Response Format

```json
{
  "error": "Error message",
  "status": 400,
  "details": {
    "field": "Description of the specific error"
  }
}
```

### Common Status Codes

| Status Code | Description                    |
|-------------|--------------------------------|
| 200         | Success                        |
| 201         | Created                        |
| 400         | Bad Request (client error)     |
| 401         | Unauthorized                   |
| 403         | Forbidden                      |
| 404         | Not Found                      |
| 409         | Conflict                       |
| 422         | Unprocessable Entity (validation error) |
| 500         | Internal Server Error          |

## Rate Limiting

API endpoints are rate-limited to prevent abuse. When a rate limit is exceeded, the API will return a 429 Too Many Requests status code with a Retry-After header indicating when to try again.

## Versioning

The G.R.I.P. API is versioned to ensure backwards compatibility. The current version is v1, which is the default and does not need to be specified in requests.

Future versions will be available at `/api/v2/...`, etc. 