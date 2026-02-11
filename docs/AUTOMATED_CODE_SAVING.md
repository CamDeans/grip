# Automated Code Saving & Build Automation

## Overview

GRIP uses **automated code saving** and **automatic builds** to streamline the development workflow. When GRIP generates code in chat, it's automatically saved to your project files, and builds run automatically to validate the changes.

## How It Works

### 1. **Automated Code Saving**

When GRIP generates code in chat:

1. **Code Block Detection**: GRIP outputs code in markdown code blocks with file paths specified above each block
   - Example: `` `src/App.tsx` `` followed by the code block
   - The file path is extracted and used for saving

2. **Automatic File Saving**: Code blocks with explicit file paths are automatically saved to project files
   - Main projects: Saved to `projectFiles` collection
   - Sandbox projects: Saved to `legalSandboxFiles` collection
   - Files are created or updated automatically

3. **User Notification**: After saving, GRIP shows which files were applied
   - Example: "**Applied:** src/App.tsx, package.json"

### 2. **Automatic Build Execution**

After files are automatically saved:

1. **Build Trigger**: If `runAfterApply` is enabled (default: `true`), a build runs automatically
   - Builds execute in a temporary environment
   - Captures build output and errors
   - Validates that the project still builds successfully

2. **Error Handling**: If build fails:
   - Errors are captured and shown to the user
   - User can send errors back to GRIP for fixes
   - GRIP can iterate on fixes automatically

3. **Success Confirmation**: If build succeeds:
   - User sees confirmation that files were saved and build passed
   - Can proceed to preview or continue development

### 3. **Manual Save Option**

Users can also manually save code blocks:

- **"Save to project" button**: Available on each code block in chat
- Useful for reviewing code before saving
- Allows selective saving of specific code blocks
- Same functionality as automated saving, but user-initiated

## Configuration

### Default Behavior

- **Automated saving**: Enabled by default
- **Automatic builds**: Enabled by default (`runAfterApply: true`)
- **Build on every save**: Yes, when files are changed

### Disabling Automatic Builds

Users can disable automatic builds by setting `runAfterApply: false`:
- Code will still be automatically saved
- Builds will not run automatically
- User can manually trigger builds when ready

## Benefits

### 1. **Faster Workflow**
- No need to manually save each file
- Code is immediately available in the project
- Reduces friction in the development process

### 2. **Immediate Validation**
- Builds run automatically after changes
- Errors are caught immediately
- Faster iteration cycles

### 3. **Consistency**
- All code follows the same saving pattern
- No risk of forgetting to save files
- Project state stays synchronized

### 4. **User Control**
- Manual save option available for review
- Can disable automatic builds if preferred
- Full control over when builds run

## Technical Implementation

### Code Saving Function

```typescript
async function saveCodeBlocksToProject(
  projectId: string,
  message: string,
  isSandbox: boolean = false
): Promise<{ saved: string[] }> {
  // Extract code blocks with file paths
  const blocks = extractCodeBlocksWithPaths(message)
  
  // Save each block to project files
  for (const { path, content } of blocks) {
    if (isSandbox) {
      await upsertLegalSandboxFile(projectId, path, content)
    } else {
      await saveProjectFile(projectId, path, content)
    }
  }
}
```

### Build Execution

```typescript
// After saving files
const { saved: appliedPaths } = await saveCodeBlocksToProject(...)

// Run build if enabled
if (runAfterApply && appliedPaths.length > 0) {
  const runResult = await runMainProject(projectId, isSandbox)
  // Handle build results and errors
}
```

## User Experience

### What Users See

1. **Chat Message**: GRIP generates code in code blocks
2. **Automatic Save**: Files are saved automatically (no user action needed)
3. **Build Execution**: Build runs automatically
4. **Results**: User sees which files were saved and build status

### Example Flow

```
User: "Add a login form component"
GRIP: [Generates code block with `src/components/LoginForm.tsx`]
      → File automatically saved
      → Build runs automatically
      → "Applied: src/components/LoginForm.tsx. Build succeeded."
```

## Best Practices

1. **Let Automation Work**: Trust the automated saving and building
2. **Review When Needed**: Use manual save if you want to review code first
3. **Monitor Builds**: Watch for build errors and send them back to GRIP
4. **Iterate Quickly**: Use automated builds to catch issues early

## Future Enhancements

- Configurable auto-save settings per project
- Batch save options for multiple files
- Build scheduling and queuing
- Selective auto-save by file type
- Build caching for faster iterations
