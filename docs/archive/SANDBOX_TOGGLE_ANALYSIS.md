# Sandbox vs Normal Build Toggle Analysis

## Current State: ❌ **NO TOGGLE EXISTS**

### How It Currently Works:

**Sandbox Mode:**
- Sandboxes are **separate projects** created from main projects
- Stored in `sandboxProjects` collection
- Have `isSandbox: true` flag
- Linked to main project via `parentProjectId`
- Use `legalSandboxFiles` collection for files
- Use `sandboxChatHistory` collection for chat
- Use `runSandboxProject()` for builds

**Normal Mode:**
- Main projects stored in `projects` collection
- Have `isSandbox: false` (or undefined)
- Use `projectFiles` collection for files
- Use `chatHistory` collection for chat
- Use `runMainProject(projectId, false)` for builds

### ❌ **No Toggle Mechanism:**
- There is **NO way** to toggle a main project to sandbox mode
- There is **NO way** to toggle a sandbox project to normal mode
- Sandboxes are **separate entities**, not a mode of a project

---

## What the User Sees Currently

### Main Project:
1. **Overview Page:**
   - Normal project UI
   - "Sandbox Experiments" card (if main project)
   - Can create sandbox experiments
   - **No toggle/switch visible**

2. **Develop Tab:**
   - Uses `/api/enhanced-chat` endpoint
   - Normal build flow
   - Files save to `projectFiles`
   - **No indication of mode**

3. **Settings Page:**
   - General settings
   - Repository settings
   - Advanced settings (analysis, build automation, etc.)
   - **NO sandbox mode toggle**

### Sandbox Project:
1. **Overview Page:**
   - "EXPERIMENT" banner at top
   - Link back to main project
   - "Promote to Main" button
   - **No toggle to convert to main**

2. **Develop Tab:**
   - Uses `/api/projects/[id]/legal-sandbox/chat` endpoint
   - Sandbox build flow
   - Files save to `legalSandboxFiles`
   - **Clear indication it's a sandbox**

---

## Should We Implement a Toggle?

### Option 1: Keep Current Approach (Separate Projects) ✅ **RECOMMENDED**

**Pros:**
- ✅ Complete isolation (no risk of mixing)
- ✅ Separate chat histories
- ✅ Clear separation of concerns
- ✅ Easy to promote experiments
- ✅ Already implemented and working

**Cons:**
- ❌ Can't toggle existing project
- ❌ Must create new sandbox for experiments

**User Flow:**
```
Main Project → Create Sandbox → Work in Sandbox → Promote to Main
```

---

### Option 2: Add Toggle to Main Projects (Legal-Safe Mode)

**What it would do:**
- Add `legalSafeMode: boolean` flag to main projects
- When enabled:
  - Uses sandbox-style system prompt
  - Saves files to `legalSandboxFiles` (or separate collection)
  - Uses clean-room generation (repo as reference only)
  - Builds use sandbox-style flow

**Pros:**
- ✅ Can toggle on/off without creating new project
- ✅ Same project, different mode
- ✅ Useful for compliance/legal requirements

**Cons:**
- ❌ More complex implementation
- ❌ Need to migrate files between collections
- ❌ Chat history mixing concerns
- ❌ Risk of confusion

**User Flow:**
```
Main Project → Toggle "Legal-Safe Mode" ON → Works like sandbox
Main Project → Toggle "Legal-Safe Mode" OFF → Works normally
```

---

## Recommendation

### ✅ **Keep Current Approach (Separate Projects)**

**Reasons:**
1. ✅ **Already implemented and working**
2. ✅ **Complete isolation** - no risk of mixing modes
3. ✅ **Clear user experience** - sandboxes are clearly experiments
4. ✅ **Promote flow works** - easy to merge successful experiments
5. ✅ **Separate chat histories** - experiments don't clutter main project

**If toggle is needed:**
- Add it as a **Settings option** for main projects
- When enabled, project behaves like sandbox (legal-safe mode)
- But keep sandboxes as separate projects for experiments

---

## Implementation Status

### ✅ What EXISTS:
- Sandbox creation (separate projects)
- Sandbox chat (separate endpoint)
- Sandbox builds (separate function)
- Promote to main (merge functionality)

### ❌ What's MISSING:
- Toggle to switch main project to sandbox mode
- Toggle to switch sandbox project to main mode
- Settings UI for mode toggle

---

## User Experience (Current)

### Creating a Sandbox:
1. User opens main project
2. Sees "Sandbox Experiments" card
3. Clicks "Empty Sandbox" or "Copy Files"
4. **New sandbox project created** (separate entity)
5. User opens sandbox → Works in sandbox mode

### Working in Sandbox:
1. User sees "EXPERIMENT" banner
2. Develop tab uses sandbox chat endpoint
3. Files save to sandbox collection
4. Builds use sandbox build function
5. **Clear indication it's a sandbox**

### Promoting to Main:
1. User satisfied with sandbox
2. Clicks "Promote to Main"
3. Files copied to main project
4. Navigated to main project
5. **Main project updated**

---

## Conclusion

**Current State:** ❌ **No toggle exists**

**Recommendation:** ✅ **Keep separate projects approach**

- Sandboxes are separate projects (not a mode)
- Clear separation and isolation
- Promote flow works well
- User experience is clear

**If toggle is desired:** Add as Settings option for main projects to enable "Legal-Safe Mode" (sandbox-style behavior), but keep sandboxes as separate experiments.
