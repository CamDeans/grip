# G.R.I.P. Developer Guide

This guide provides technical information for developers working with the G.R.I.P. codebase. It covers code organization, extension patterns, and development best practices.

## Codebase Organization

The G.R.I.P. codebase follows a structured organization to maintain separation of concerns and modularity:

```
src/
├── app/                    # Next.js app directory
│   ├── api/                # API routes
│   ├── (routes)/           # Frontend routes
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── admin/              # Admin dashboard components
│   ├── analysis/           # Analysis view components  
│   ├── chat/               # Chat interface components
│   ├── project/            # Project management components
│   ├── providers/          # Context providers
│   ├── terminal/           # Terminal components
│   └── ui/                 # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
│   ├── ai/                 # AI integration utilities
│   ├── db/                 # Database access layer
│   ├── validation/         # Input validation
│   └── utils/              # General utilities
├── styles/                 # Global styles
└── types/                  # TypeScript type definitions
```

## Key Architectural Patterns

### 1. Context Providers

G.R.I.P. uses React Context API extensively for state management. The main context providers are:

- `EnhancedChatProvider`: Manages chat state with project context
- `ProjectProvider`: Provides project data and operations
- `TerminalProvider`: Manages terminal sessions and commands
- `AnalysisProvider`: Provides repository analysis data

These providers follow a consistent pattern:

```tsx
// Example pattern for context providers
export function SomeProvider({ children, projectId }) {
  // State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data fetching
  useEffect(() => {
    fetchData();
  }, [projectId]);

  // Operations (wrapped with useCallback)
  const performOperation = useCallback(async () => {
    // Implementation
  }, [dependencies]);

  // Memoized context value
  const value = useMemo(() => ({
    data,
    loading,
    error,
    performOperation
  }), [data, loading, error, performOperation]);

  return (
    <SomeContext.Provider value={value}>
      {children}
    </SomeContext.Provider>
  );
}
```

### 2. API Route Handlers

API routes follow a consistent pattern with proper error handling:

```typescript
// Example API route handler
export async function GET(request: Request) {
  try {
    // Authentication check
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Request processing
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Parameter validation
    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter' }, { status: 400 });
    }

    // Database operation
    const data = await someDbOperation(id);

    // Response
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3. Component Composition

G.R.I.P. uses component composition to build complex UIs:

```tsx
// Example component composition
export function ComplexFeature() {
  return (
    <FeatureLayout>
      <FeatureHeader />
      <FeatureContent>
        <SubComponentA />
        <SubComponentB />
      </FeatureContent>
      <FeatureFooter />
    </FeatureLayout>
  );
}
```

### 4. Custom Hooks

Custom hooks extract reusable logic:

```typescript
// Example custom hook
export function useFeature(id: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(`/api/feature/${id}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchData();
  }, [id]);

  return { data, loading, error };
}
```

## Extending G.R.I.P.

### Adding a New Feature

To add a new feature to G.R.I.P., follow these steps:

1. **Plan the feature**:
   - Define the feature's purpose and user stories
   - Identify affected components and services
   - Determine required data models and API changes

2. **Create necessary data models**:
   - Add TypeScript interfaces in the `types` directory
   - Implement database schema and methods in `lib/db`

3. **Implement backend functionality**:
   - Create or update API routes in `app/api`
   - Implement services in appropriate `lib` directory

4. **Create frontend components**:
   - Add React components in the appropriate subdirectory
   - Create/update context providers if needed
   - Implement custom hooks for the feature

5. **Add to the UI**:
   - Integrate the feature into the appropriate pages
   - Update navigation if needed

6. **Write tests**:
   - Add unit tests for utilities and hooks
   - Create integration tests for component interactions
   - Implement end-to-end tests for the complete feature

### Adding AI Capabilities

To extend G.R.I.P.'s AI capabilities:

1. **Define the AI task**:
   - Clearly specify the input, output, and constraints
   - Determine required context and background information

2. **Design the prompt**:
   - Create a prompt template in `lib/ai/prompts`
   - Include placeholders for dynamic context

3. **Implement the AI service**:
   - Create a service function in `lib/ai/services`
   - Add appropriate error handling and retries

4. **Create the API endpoint**:
   - Add an API route in `app/api`
   - Implement request validation
   - Call the AI service

5. **Integrate with the UI**:
   - Create or update components to use the new AI capability
   - Add appropriate loading states and error handling

Example AI service:

```typescript
// lib/ai/services/codeGeneration.ts
export async function generateCodeFromDescription(
  description: string, 
  projectContext: ProjectContext,
  existingCode?: string[]
) {
  try {
    // Prepare prompt with context
    const prompt = prepareCodeGenerationPrompt(
      description,
      projectContext,
      existingCode
    );
    
    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4096,
      system: prompt.system,
      messages: prompt.messages
    });
    
    // Process response
    return processCodeGenerationResponse(response);
  } catch (error) {
    console.error('Code generation error:', error);
    throw new AiServiceError('Failed to generate code', { cause: error });
  }
}
```

## Working with the Database

G.R.I.P. uses MongoDB for data storage, with collections for projects, analysis, files, and other entities.

### Database Connection

The database connection is managed in `lib/db/mongodb.ts`:

```typescript
// Example database connection
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add MONGODB_URI to .env');
}

if (process.env.NODE_ENV === 'development') {
  // In development, use a global variable to maintain connection across reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new connection for each request
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
```

### Database Operations

Database operations are implemented in the `lib/db` directory:

```typescript
// Example database operations
export async function getProjectById(id: string) {
  const client = await clientPromise;
  const db = client.db('test');
  
  return db.collection('projects').findOne({ _id: new ObjectId(id) });
}

export async function createProject(data: ProjectInput) {
  const client = await clientPromise;
  const db = client.db('test');
  
  const result = await db.collection('projects').insertOne({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return result.insertedId;
}
```

## Working with the AI API

G.R.I.P. uses Anthropic's Claude for AI capabilities.

### Anthropic Client

The Anthropic client is configured in `lib/ai/anthropic.ts`:

```typescript
// Example Anthropic client configuration
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing ANTHROPIC_API_KEY');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Prompt Engineering

Prompts are designed in `lib/ai/prompts` directory:

```typescript
// Example prompt template
export function createCodeGenerationPrompt(
  description: string,
  projectContext: ProjectContext,
  existingCode?: string[]
) {
  const systemPrompt = `You are G.R.I.P. (GitHub Repo-Analysis Intellectual Partner), an AI assistant specialized in generating code.
  
Project Context:
Title: ${projectContext.title}
Description: ${projectContext.description}
Technology Stack: ${projectContext.technicalRequirements || 'Not specified'}

${existingCode && existingCode.length > 0 ? `
Existing Code Examples:
${existingCode.join('\n\n')}
` : ''}

Your task is to generate high-quality, well-documented code based on the user's description.
Follow these guidelines:
1. Use the project's coding style and conventions
2. Include proper error handling
3. Add informative comments
4. Follow best practices for the target language/framework`;

  return {
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: description
      }
    ]
  };
}
```

## Testing

G.R.I.P. uses Jest for testing, with different approaches for different types of tests.

### Unit Tests

Unit tests focus on individual functions and hooks:

```typescript
// Example unit test
describe('validation utility', () => {
  it('validates project input correctly', () => {
    const validInput = {
      title: 'Test Project',
      description: 'A test project'
    };
    
    const invalidInput = {
      description: 'Missing title'
    };
    
    expect(validateProjectInput(validInput).isValid).toBe(true);
    expect(validateProjectInput(invalidInput).isValid).toBe(false);
  });
});
```

### Integration Tests

Integration tests verify component interactions:

```tsx
// Example integration test
describe('Project Creation Flow', () => {
  it('creates a project and redirects to dashboard', async () => {
    // Mock API responses
    server.use(
      rest.post('/api/projects', (req, res, ctx) => {
        return res(
          ctx.json({
            id: 'test-project-id',
            title: 'Test Project'
          })
        );
      })
    );
    
    render(<ProjectCreationForm />);
    
    // Fill out form
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test Project' }
    });
    
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'A test project' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    
    // Verify redirect
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/projects/test-project-id')
      );
    });
  });
});
```

### End-to-End Tests

End-to-end tests validate complete workflows:

```tsx
// Example E2E test
describe('Project Generation Workflow', () => {
  it('completes the full project creation and code generation process', async () => {
    // Set up mock API responses for the entire workflow
    setupMockResponses();
    
    render(<WorkflowTestHarness />);
    
    // Step 1: Create project
    await completeProjectCreationStep();
    
    // Step 2: Analyze repository
    await completeRepositoryAnalysisStep();
    
    // Step 3: Generate plan
    await completePlanGenerationStep();
    
    // Step 4: Generate code
    await completeCodeGenerationStep();
    
    // Verify workflow completion
    expect(screen.getByText(/workflow completed/i)).toBeInTheDocument();
  });
});
```

## Performance Optimization

Follow these best practices for performance:

1. **Component Optimization**:
   - Use React.memo for expensive components
   - Implement useCallback for functions in dependencies
   - Use useMemo for computed values

2. **Data Fetching**:
   - Implement proper loading states
   - Add error boundaries
   - Use optimistic updates where appropriate

3. **API Calls**:
   - Debounce rapidly firing events
   - Implement request batching when possible
   - Add appropriate caching with TTL

4. **Large Lists**:
   - Use virtualization for large lists (react-window)
   - Implement pagination for API endpoints
   - Add infinite scrolling for better UX

5. **Code Splitting**:
   - Use dynamic imports for large components
   - Implement React.lazy for route-based splitting
   - Use Suspense boundaries with fallbacks

## Security Best Practices

Follow these security best practices:

1. **Authentication and Authorization**:
   - Always verify user sessions on API routes
   - Implement proper permission checks
   - Use secure session cookies

2. **Data Validation**:
   - Validate all user inputs
   - Sanitize data before display
   - Use parameterized queries for database operations

3. **API Security**:
   - Implement rate limiting
   - Add CSRF protection
   - Use appropriate HTTP security headers

4. **Environment Variables**:
   - Never expose sensitive keys in client code
   - Use .env.local for local development
   - Implement proper secret management in production

5. **Code Security**:
   - Avoid dangerous functions (eval, etc.)
   - Regularly update dependencies
   - Follow OWASP security guidelines

## Debugging

For effective debugging:

1. **Server-Side Logging**:
   - Use structured logging with appropriate levels
   - Include contextual information (request ID, user ID)
   - Add timestamps to all log entries

2. **Client-Side Debugging**:
   - Use React DevTools for component inspection
   - Implement client-side error tracking
   - Add debug toggles for verbose logging

3. **API Debugging**:
   - Use appropriate status codes
   - Return helpful error messages
   - Log request/response for problematic endpoints

4. **State Management Debugging**:
   - Use Redux DevTools or Context DevTools
   - Add state snapshots at critical points
   - Implement state logging in development

## Deployment

G.R.I.P. can be deployed using various methods:

1. **Vercel Deployment**:
   - Connect repository to Vercel
   - Configure environment variables
   - Set up preview environments for PRs

2. **Docker Deployment**:
   - Use the provided Dockerfile
   - Build image with `docker build -t grip .`
   - Run with `docker run -p 3000:3000 grip`

3. **Custom Server Deployment**:
   - Build with `npm run build`
   - Start with `npm start`
   - Use PM2 or similar for process management

## Common Pitfalls and Solutions

1. **Context Provider Nesting**:
   - Problem: Excessive context provider nesting
   - Solution: Combine related providers or use composition

2. **API Error Handling**:
   - Problem: Inconsistent API error handling
   - Solution: Implement a central error handling utility

3. **Performance Issues**:
   - Problem: Slow component rendering
   - Solution: Use React.memo and performance profiling

4. **Memory Leaks**:
   - Problem: Uncleared intervals or async operations
   - Solution: Proper cleanup in useEffect return functions

5. **State Management Complexity**:
   - Problem: Complex state updates
   - Solution: Use useReducer for complex state logic 