# G.R.I.P. Testing Guide

This guide provides comprehensive information about testing the G.R.I.P. platform, including unit tests, integration tests, and end-to-end tests.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Environment Setup](#test-environment-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Test Coverage](#test-coverage)
- [Continuous Integration](#continuous-integration)
- [Writing New Tests](#writing-new-tests)
- [Troubleshooting Tests](#troubleshooting-tests)

## Testing Philosophy

G.R.I.P. follows a comprehensive testing approach to ensure reliability and maintainability:

- **Unit Tests**: Verify individual components function correctly in isolation
- **Integration Tests**: Ensure components work together correctly
- **End-to-End Tests**: Validate complete user workflows

Our testing strategy aims to:

1. Catch bugs early in the development process
2. Ensure consistent behavior across all system components
3. Facilitate safe refactoring and feature additions
4. Provide documentation of expected behavior

## Test Environment Setup

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- MongoDB connection (test database)
- Jest and React Testing Library

### Setup Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a test environment file:
   ```bash
   cp .env.example .env.test
   ```

3. Configure the test environment:
   ```
   # Test database (use a separate database from development)
   MONGODB_URI=your_test_mongodb_uri
   
   # Test authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=test_secret
   
   # Mock API keys
   ANTHROPIC_API_KEY=test_api_key
   ```

## Unit Testing

Unit tests focus on testing individual components, functions, and utilities in isolation.

### Running Unit Tests

To run all unit tests:

```bash
npm test
```

To run specific unit tests:

```bash
npm test -- -t "component name"
```

To run tests in watch mode during development:

```bash
npm test -- --watch
```

### Unit Test Structure

G.R.I.P. unit tests follow this structure:

```typescript
import { render, screen } from '@testing-library/react';
import ComponentToTest from './ComponentToTest';

// Optional: Mock dependencies
jest.mock('../path/to/dependency', () => ({
  useSomeHook: jest.fn().mockReturnValue({ data: 'mock data' }),
}));

describe('ComponentToTest', () => {
  // Setup that runs before each test
  beforeEach(() => {
    // Reset mocks, initialize data, etc.
  });

  // Tests
  it('renders correctly', () => {
    render(<ComponentToTest prop1="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    render(<ComponentToTest prop1="value" />);
    await userEvent.click(screen.getByRole('button', { name: 'Click Me' }));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Key Unit Testing Areas

- **UI Components**: Testing rendering and user interactions
- **Hooks**: Testing custom React hooks behavior
- **Utilities**: Testing helper functions and data processors
- **API Clients**: Testing API request and response handling
- **State Management**: Testing context providers and state updates

## Integration Testing

Integration tests verify that multiple components work together correctly.

### Running Integration Tests

```bash
npm run test:integration
```

### Integration Test Structure

```typescript
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SomeProvider } from './SomeProvider';
import ComponentWithProvider from './ComponentWithProvider';

describe('Component with Provider Integration', () => {
  beforeEach(() => {
    // Setup mock API responses
    fetchMock.resetMocks();
    fetchMock.mockResponseOnce(JSON.stringify({ data: 'test data' }));
  });

  it('fetches and displays data correctly', async () => {
    render(
      <SomeProvider>
        <ComponentWithProvider />
      </SomeProvider>
    );

    // Wait for async operations
    await screen.findByText('Loading...');
    await screen.findByText('test data');

    // Interact with component
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    // Verify second API call
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('test data')).toBeInTheDocument();
  });
});
```

### Key Integration Testing Areas

- **Provider Integration**: Testing components with context providers
- **Form Submissions**: Testing form validation and submission flows
- **API Integration**: Testing components that make API calls
- **Component Composition**: Testing parent-child component communication
- **Route Navigation**: Testing components that involve route changes

## End-to-End Testing

End-to-end tests validate complete user workflows from start to finish.

### Running E2E Tests

```bash
npm run test:e2e
```

### E2E Test Structure

G.R.I.P. uses Cypress for end-to-end testing:

```typescript
describe('Project Creation Flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('test@example.com', 'password');
  });

  it('creates a new project successfully', () => {
    // Visit dashboard
    cy.visit('/dashboard');
    
    // Click new project button
    cy.findByRole('button', { name: 'New Project' }).click();
    
    // Fill form
    cy.findByLabelText('Project Title').type('Test Project');
    cy.findByLabelText('Description').type('This is a test project');
    cy.findByLabelText('Repository URL').type('https://github.com/example/repo');
    
    // Submit form
    cy.findByRole('button', { name: 'Create Project' }).click();
    
    // Verify project creation
    cy.url().should('include', '/projects/');
    cy.findByText('Test Project').should('exist');
    cy.findByText('This is a test project').should('exist');
  });
});
```

### Key E2E Testing Areas

- **Authentication Flows**: Testing login, registration, and access control
- **Project Creation**: Testing the complete project setup workflow
- **Chat Interactions**: Testing multi-step conversations with G.R.I.P.
- **Code Generation**: Testing the complete code generation process
- **Deployment**: Testing the deployment workflow

## Test Coverage

G.R.I.P. aims for high test coverage to ensure reliability.

### Checking Coverage

To generate a test coverage report:

```bash
npm test -- --coverage
```

This generates a coverage report in the `coverage` directory.

### Coverage Targets

- **Unit Tests**: >80% coverage for core utilities and components
- **Integration Tests**: >70% coverage for feature workflows
- **E2E Tests**: Coverage of all critical user paths

## Continuous Integration

G.R.I.P. uses GitHub Actions for continuous integration testing.

### CI Workflow

The CI pipeline runs:

1. Linting and type checking
2. Unit tests
3. Integration tests
4. Build verification
5. End-to-end tests on the build

### CI Configuration

The CI configuration is defined in `.github/workflows/ci.yml`.

## Writing New Tests

When adding new features or fixing bugs, follow these guidelines for testing:

### For Components

1. Write unit tests for rendering and basic interactions
2. Write integration tests for data fetching and state updates
3. Update E2E tests if the component is part of a critical path

### For Utilities

1. Test each function with various inputs, including edge cases
2. Test error handling and validation logic
3. Ensure high coverage for utility functions

### For API Endpoints

1. Test request validation and error responses
2. Test successful responses with various inputs
3. Test authentication and authorization logic

## Troubleshooting Tests

Common test issues and their solutions:

### Test Timeouts

**Problem**: Tests time out waiting for elements or async operations

**Solutions**:
- Increase the Jest timeout: `jest.setTimeout(10000)`
- Use `findBy` instead of `getBy` for elements that appear asynchronously
- Check for infinite loops or unresolved Promises

### Mock Issues

**Problem**: Tests fail due to mock implementation issues

**Solutions**:
- Ensure mocks are reset between tests with `beforeEach(() => jest.resetAllMocks())`
- Verify mock return values match expected component behavior
- Check mock implementation for unhandled scenarios

### Rendering Issues

**Problem**: Components don't render as expected in tests

**Solutions**:
- Ensure all required providers are included in the test render
- Check for conditional rendering logic that may prevent elements from appearing
- Verify CSS-in-JS styles are properly applied in the test environment

### Database Issues

**Problem**: Integration tests fail due to database errors

**Solutions**:
- Use a separate test database
- Clear database between tests
- Mock database interactions for faster tests 