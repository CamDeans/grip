# Sandbox Chat Separation Analysis

## Current State

### ✅ What EXISTS:

1. **Separate Sandbox Chat Route** (`/api/projects/[id]/legal-sandbox/chat`)
   - Uses `runSandboxProject()` - separate build function
   - Uses `sandboxChatHistory` collection - separate chat history
   - Uses `buildLegalSandboxSystemPrompt()` - sandbox-specific prompt
   - Uses `listLegalSandboxFiles()` / `upsertLegalSandboxFile()` - sandbox file operations
   - Has `parseAndExecuteSandboxGripActions()` - sandbox-specific actions

2. **Unified Enhanced Chat Route** (`/api/enhanced-chat`)
   - Currently handles BOTH main and sandbox projects
   - Detects `isSandbox` flag and routes accordingly
   - Uses `runMainProject(projectId, isSandbox)` - unified build function
   - Uses `chatHistory` collection for both
   - Uses unified system prompt with conditional sandbox logic

### ❌ Current Issue:

**Frontend always uses `/api/enhanced-chat`** regardless of project type.

---

## Recommendation: **YES, Separate Them**

### Benefits of Separation:

1. **Clear Separation of Concerns**
   - Sandbox chat = experimental, legal-safe mode
   - Main chat = production-ready mode
   - Different system prompts optimized for each use case

2. **Independent Build Flows**
   - Sandbox uses `runSandboxProject()` - dedicated sandbox build
   - Main uses `runMainProject()` - dedicated main build
   - No risk of cross-contamination

3. **Separate Chat History**
   - Sandbox experiments don't clutter main project chat
   - Easier to track experiment conversations
   - Better for debugging and analysis

4. **Different System Prompts**
   - Sandbox: Focus on legal-safe, clean-room generation
   - Main: Focus on production-ready code with repo integration
   - Each can be optimized independently

5. **Better User Experience**
   - Clear indication of which mode you're in
   - Sandbox experiments feel truly isolated
   - Easier to understand what's happening

---

## Implementation Plan

### Step 1: Update Frontend to Route Based on Project Type

**File:** `src/components/providers/EnhancedChatProvider.tsx`

**Change:**
- Detect if project is sandbox (`isSandbox` flag)
- Route to `/api/projects/[id]/legal-sandbox/chat` for sandbox projects
- Route to `/api/enhanced-chat` for main projects

### Step 2: Update Enhanced Chat Page

**File:** `src/app/dashboard/projects/[id]/enhanced-chat/page.tsx`

**Change:**
- Fetch project to check `isSandbox` flag
- Pass endpoint info to provider or handle routing in provider

### Step 3: Ensure Both Endpoints Have Same Features

**Verify:**
- ✅ Both have build automation
- ✅ Both have file saving
- ✅ Both have error feedback
- ✅ Both have chat history persistence

---

## Comparison Table

| Feature | Unified (`/api/enhanced-chat`) | Separate (`/legal-sandbox/chat`) |
|---------|-------------------------------|----------------------------------|
| **Build Function** | `runMainProject(projectId, isSandbox)` | `runSandboxProject(projectId)` |
| **File Storage** | Routes based on `isSandbox` | Always `legalSandboxFiles` |
| **Chat History** | `chatHistory` (both types) | `sandboxChatHistory` |
| **System Prompt** | Unified with conditional logic | Dedicated sandbox prompt |
| **Grip Actions** | Unified handler | Sandbox-specific handler |
| **Error Handling** | Unified | Separate |

---

## Recommendation: **Implement Separation**

**Reasons:**
1. ✅ Sandbox chat route already exists and is fully functional
2. ✅ Better separation of concerns
3. ✅ Independent build flows (no risk of mixing)
4. ✅ Separate chat histories (cleaner data)
5. ✅ Optimized prompts for each use case
6. ✅ Better user experience (clear mode indication)

**Implementation Complexity:** Low
- Just need to update frontend routing
- Both endpoints already exist and work
- No breaking changes needed

---

## Next Steps

1. ✅ Update `EnhancedChatProvider` to detect project type
2. ✅ Route sandbox projects to `/api/projects/[id]/legal-sandbox/chat`
3. ✅ Route main projects to `/api/enhanced-chat`
4. ✅ Test both flows independently
5. ✅ Update documentation
