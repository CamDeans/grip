# G.R.I.P. (GitHub Repo-Analysis Intellectual Partner) Documentation

## Overview

G.R.I.P. is an AI-powered development platform that assists in project planning, code generation, and automation. The system analyzes project requirements, creates development plans, generates code, and provides real-time assistance throughout the development process.

## Core Architecture

G.R.I.P. is built on a modern stack with the following key technologies:

- **Frontend**: Next.js with TypeScript
- **Backend**: Node.js
- **Database**: MongoDB (Atlas)
- **AI Integration**: Claude (Anthropic)
- **Real-time Communication**: WebSockets (Socket.IO)

## System Components

### 1. Project Context Engine

The Project Context Engine maintains a comprehensive understanding of the project by integrating:

- Project details and requirements
- Repository analysis
- File system structure
- Build logs
- Development history

This context is used to provide relevant, project-specific guidance and code generation.

### 2. Chat Interface System

The enhanced chat interface allows users to interact with G.R.I.P. through:

- Context-aware messaging
- Project context display panel
- File previews and code snippets
- Action buttons for common tasks
- Task progress indicators

### 3. Code Generation System

G.R.I.P. can generate code for projects through:

- Template-based generation
- Context-aware code creation
- Multi-language support
- Version control for generated files
- File storage and retrieval

### 4. Build Automation System

The automation system handles project builds through:

- Task queue management
- Command generation
- Background execution
- Error recovery
- Detailed logging

### 5. Terminal Integration

G.R.I.P. provides a virtual terminal for:

- Command execution
- Session persistence
- Command suggestions
- Terminal-chat integration

### 6. Admin Dashboard

The admin interface enables monitoring and control through:

- Build monitoring
- File exploration
- Task management
- Execution controls
- User interaction tracking

## User Workflows

### Project Creation and Analysis

1. Create a new project with a title, description, and a **required** GitHub repository (select via Generate Keywords and Search)
2. G.R.I.P. analyzes the repository structure and code patterns automatically
3. A development plan is generated automatically; project requirements come from the analysis and ideation (goals, audience, features, technical requirements). Plain language and technical details are both supported.

### Development Planning

1. G.R.I.P. generates a development plan based on analysis
2. The plan outlines phases, steps, and dependencies
3. Users can modify and confirm the plan

### Code Generation

1. Users request code generation through chat
2. G.R.I.P. creates code files based on context and requirements
3. Generated files are stored in the database and can be previewed

### Deployment Automation

1. G.R.I.P. creates a deployment plan
2. Automated tasks execute build, test, and deployment steps
3. Progress is monitored through the admin dashboard

## API Reference

### Project API

- `GET /api/projects`: List all projects
- `GET /api/projects/:id`: Get project details
- `POST /api/projects`: Create a new project
- `PUT /api/projects/:id`: Update project details
- `DELETE /api/projects/:id`: Delete a project

### Analysis API

- `GET /api/analysis/:projectId`: Get project analysis
- `POST /api/projects/:id/analyze`: Trigger repository analysis

### Chat API

- `GET /api/chat/history`: Get chat history for a project
- `POST /api/chat`: Send a chat message
- `POST /api/enhanced-chat`: Send a context-enhanced message

### File API

- `GET /api/project-files/list`: List files for a project
- `GET /api/project-files/:id`: Get file details
- `POST /api/project-files`: Create a new file
- `PUT /api/project-files/:id`: Update a file
- `DELETE /api/project-files/:id`: Delete a file

### Build API

- `GET /api/build-logs/:projectId`: Get build logs
- `POST /api/projects/:id/build`: Trigger a build
- `GET /api/admin/builds`: List all builds
- `POST /api/admin/builds/:id/stop`: Stop a build

### Terminal API

- `POST /api/terminal/execute`: Execute a terminal command
- `GET /api/terminal/:id/history`: Get terminal history
- `POST /api/terminal/create`: Create a new terminal session

## Data Models

### Project Model

```typescript
interface Project {
  id: string;
  title: string;
  description: string;
  repositoryUrl?: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  ideation?: {
    goals: string;
    targetAudience: string;
    keyFeatures: string;
    technicalRequirements: string;
  };
}
```

### Analysis Model

```typescript
interface Analysis {
  id: string;
  projectId: string;
  repositoryStructure?: {
    files: Array<{
      path: string;
      type: string;
      language?: string;
    }>;
    totalFiles: number;
    languages: Record<string, number>;
  };
  codeStructure?: {
    fileCount: number;
    directoryStructure: string[];
    mainLanguages: Record<string, number>;
    components: string[];
    features: string[];
  };
  recommendations?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: Date;
}
```

### ProjectFile Model

```typescript
interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  filename: string;
  content: string;
  language: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### ProjectStructure Model

```typescript
interface ProjectStructure {
  id: string;
  projectId: string;
  name: string;
  fileHierarchy: {
    type: 'directory' | 'file';
    name: string;
    path: string;
    children?: any[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### BuildLog Model

```typescript
interface BuildLog {
  id: string;
  projectId: string;
  taskType: string;
  command: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  output: string;
  startTime: Date;
  endTime?: Date;
}
```

### Terminal Model

```typescript
interface Terminal {
  id: string;
  projectId: string;
  sessionId: string;
  history: Array<{
    command: string;
    output: string;
    timestamp: Date;
  }>;
  currentDirectory: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

## Performance Optimizations

G.R.I.P. includes several performance optimizations:

1. **Component Memoization**: React.memo is used for expensive components
2. **Debounced API Calls**: Prevents excessive API calls
3. **Response Caching**: Frequently used AI responses are cached
4. **Lazy Loading**: Components are loaded on demand
5. **Parallel Data Loading**: Context data is loaded in parallel
6. **Code Splitting**: Reduces initial load time

## Security Measures

G.R.I.P. implements the following security measures:

1. **Authentication**: Next-Auth for secure user authentication
2. **Data Validation**: Input validation on all API endpoints
3. **API Rate Limiting**: Prevents abuse of API resources
4. **Secure WebSocket**: Authentication for real-time connections
5. **Environment Variables**: Sensitive configuration in .env files

## Installation Guide

### Prerequisites

Before installing G.R.I.P., ensure you have the following prerequisites:

- Node.js 16.x or higher
- MongoDB Atlas account
- Anthropic API key
- GitHub OAuth credentials (for repository access)

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/grip.git
   cd grip
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment files:
   ```bash
   cp .env.example .env.local
   ```

4. Update the `.env.local` file with your credentials:
   ```
   # MongoDB
   MONGODB_URI=your_mongodb_uri

   # Authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   GITHUB_ID=your_github_oauth_id
   GITHUB_SECRET=your_github_oauth_secret

   # AI Services
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Build for production:
   ```bash
   npm run build
   ```

7. Start the production server:
   ```bash
   npm start
   ```

## Deployment Guide

### Deploying to Vercel

1. Create a Vercel account and link your GitHub repository
2. Add the environment variables from your `.env.local` file to Vercel
3. Deploy the application

### Custom Deployment

For custom deployments, follow these steps:

1. Build the application:
   ```bash
   npm run build
   ```

2. Set up environment variables on your server
3. Start the application using a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name "grip" -- start
   ```

## Contributing

### Development Environment Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies
4. Create a feature branch
5. Make your changes
6. Run tests
7. Submit a pull request

### Coding Standards

- Follow TypeScript best practices
- Use consistent formatting
- Write descriptive commit messages
- Include tests for new features
- Document API changes

## Troubleshooting

### Common Issues

1. **Connection to MongoDB fails**
   - Check your MongoDB URI
   - Ensure IP whitelist includes your server
   - Verify database user permissions

2. **API calls return 401 errors**
   - Check authentication setup
   - Verify token expiration
   - Ensure correct credentials

3. **AI integration not working**
   - Verify Anthropic API key
   - Check rate limits
   - Look for error logs

4. **Real-time updates not working**
   - Check WebSocket connections
   - Verify Socket.IO setup
   - Look for connection errors

## Version History

### v1.0.0 (Initial Release)
- Base functionality
- Project analysis
- Chat interface
- Code generation

### v1.1.0
- Enhanced project context
- Improved terminal integration
- Build automation system
- Admin dashboard

## License

G.R.I.P. is licensed under the MIT License. See the LICENSE file for details. 