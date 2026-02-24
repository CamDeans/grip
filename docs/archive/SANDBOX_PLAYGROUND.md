# Sandbox Playground

## Overview

The Sandbox Playground is GRIP's isolated experimentation environment that allows users to safely test new architectures, risky refactors, or experimental features without affecting their main project. When experiments are successful, users can promote changes back to the main project with one click.

## Key Features

### 1. **Isolated Environment**
- Each sandbox experiment is completely separate from the main project
- Changes in sandbox do not affect the main project until explicitly promoted
- Full build automation and testing capabilities in isolation

### 2. **Clean-Room Code Generation**
- Sandbox uses the same clean-room code generation approach as main projects
- Repository is used as reference only—all code is newly generated
- Perfect for legal-safe mode and compliance requirements

### 3. **Use Cases**

#### Architecture Experiments
- Try new patterns (e.g., migrating from `pages/` to `app/` routes in Next.js)
- Test different folder structures or organizational approaches
- Experiment with new frameworks or libraries

#### Risky Refactors
- Test major changes or dependency updates in isolation
- Validate breaking changes before applying to main project
- Experiment with new coding patterns or conventions

#### Legal-Safe Mode
- Strict clean-room generation for compliance requirements
- Repository is reference only—no code copying
- All generated code is original implementation

### 4. **Promote to Main**
- One-click promotion of successful experiments
- Selectively promote files from sandbox to main project
- Option to overwrite existing files or skip conflicts
- Automatic build verification after promotion

## User Flow

### Creating a Sandbox Experiment

1. **From Main Project Overview**
   - Navigate to your main project
   - Scroll to "Sandbox Experiments" section
   - Click "Create New Experiment"
   - Choose "Empty Sandbox" or "Copy Files" (starts with current project files)

2. **Sandbox Project Created**
   - New sandbox project appears in your projects list
   - Linked to parent main project
   - Has its own isolated file storage and chat history

### Developing in Sandbox

1. **Sandbox Develop Page**
   - Navigate to sandbox project
   - Click "Develop" tab (routes to `/sandbox-chat`)
   - Chat with GRIP in isolated environment
   - All code generation happens in sandbox context

2. **Automated Code Saving & Builds**
   - Code blocks with file paths are automatically saved to sandbox project files
   - GRIP automatically runs builds after files are saved
   - Build errors are captured and can be sent back to GRIP
   - Iterate until successful build
   - Users can also manually save code blocks if they prefer to review first

3. **Testing & Validation**
   - Preview sandbox project in StackBlitz
   - Test functionality in isolation
   - Validate that changes work as expected

### Promoting to Main

1. **From Sandbox Project**
   - Click "Promote to Main" button in sandbox banner
   - Or use "Promote" button in main project's "Active Experiments" list

2. **Promotion Process**
   - Select files to promote (or promote all)
   - Choose overwrite behavior (overwrite existing or skip conflicts)
   - Files are copied from sandbox to main project
   - Main project's `updatedAt` timestamp is updated

3. **After Promotion**
   - Promoted files appear in main project
   - Main project can continue development with promoted changes
   - Sandbox experiment remains available for reference

## Technical Implementation

### Data Storage

- **Sandbox Projects**: Stored in `sandboxProjects` collection
- **Sandbox Files**: Stored in `legalSandboxFiles` collection
- **Sandbox Chat**: Separate chat history in `sandboxChatHistory` collection
- **Sandbox Plans**: Stored in `legalSandboxPlans` collection
- **Sandbox Analysis**: Stored in `sandboxAnalyses` collection

### API Endpoints

- `POST /api/projects/[id]/create-sandbox` - Create new sandbox experiment
- `GET /api/projects/[id]/sandboxes` - List sandbox experiments for a main project
- `POST /api/projects/[id]/legal-sandbox/chat` - Sandbox chat endpoint
- `GET /api/projects/[id]/legal-sandbox/chat/history` - Sandbox chat history
- `POST /api/projects/[id]/promote-sandbox` - Promote sandbox files to main project

### UI Components

- **Sandbox Chat Page**: `/dashboard/projects/[id]/sandbox-chat`
- **Sandbox Banner**: Shows in sandbox project overview
- **Active Experiments List**: Shows in main project overview
- **Promote Buttons**: Available in both sandbox and main project views

## Benefits

1. **Risk-Free Experimentation**: Test changes without fear of breaking main project
2. **Iterative Development**: Build, test, and refine in isolation before promoting
3. **Legal Compliance**: Clean-room generation ensures no code copying
4. **Workflow Efficiency**: Seamless promotion process when experiments succeed
5. **Project Organization**: Keep experiments linked to main projects for easy reference

## Best Practices

1. **Use Sandbox for Risky Changes**: Any change that might break the main project should be tested in sandbox first
2. **Validate Before Promoting**: Ensure sandbox builds successfully and functionality works before promoting
3. **Document Experiments**: Use sandbox project descriptions to note what you're testing
4. **Promote Incrementally**: Promote files in batches rather than all at once for easier rollback if needed
5. **Clean Up**: Archive or delete sandbox experiments that are no longer needed

## Future Enhancements

- Sandbox comparison view (diff between sandbox and main)
- Bulk promotion with file selection UI
- Sandbox templates for common experiment types
- Automated testing integration in sandbox builds
- Sandbox sharing/collaboration features
