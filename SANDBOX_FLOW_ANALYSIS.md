# Sandbox Flow Analysis & Implementation Plan

## Current State Analysis

### ✅ What EXISTS:

#### 1. Sandbox Creation Flow
- **Route:** `POST /api/projects/[id]/create-sandbox`
- **Features:**
  - Creates sandbox project linked to main project (`parentProjectId`)
  - Optionally copies files from main project
  - Stores in `sandboxProjects` collection
  - Returns sandbox project with `isSandbox: true`

#### 2. Automated Build Flow
- **Location:** `src/app/api/enhanced-chat/route.ts`
- **Process:**
  1. User sends message → Enhanced chat route
  2. GRIP generates code → Code blocks extracted
  3. Files saved → `saveCodeBlocksToProject()` (routes to correct collection)
  4. **Automatic build** → `runMainProject(projectId, isSandbox)` runs automatically
  5. Build result → Errors fed back into chat if build fails
  6. Loop continues → User can fix errors, GRIP regenerates until successful

#### 3. Build Automation Details
- **Function:** `runMainProject(projectId, isSandbox)`
- **Process:**
  1. Gets files from appropriate collection (`projectFiles` or `legalSandboxFiles`)
  2. Creates temp directory
  3. Writes all files
  4. Runs `npm install`
  5. Runs `npm run build` (or `npm run dev` if no build script)
  6. Captures errors/output
  7. Returns success status and errors
  8. Cleans up temp directory

### ❌ What's MISSING:

#### Merge/Promote Functionality
- **Gap:** No way to merge sandbox changes back to main project
- **Needed:**
  1. API route to promote sandbox files to main project
  2. UI button/action in sandbox project view
  3. Conflict resolution (if main project has changes)
  4. Option to merge all files or select specific files

---

## Complete Flow (Current + Proposed)

### Step 1: Create Sandbox ✅
1. User opens main project → Overview page
2. Clicks "Create New Experiment" → "Empty Sandbox" or "Copy Files"
3. Sandbox created → Appears in "Sandbox Experiments" list
4. User clicks "Open" → Navigates to sandbox project

### Step 2: Build in Sandbox ✅
1. User opens sandbox → Same UI as main project
2. Goes to "Develop" tab → Enhanced chat
3. User asks GRIP to implement features
4. **Automated flow:**
   - GRIP generates code
   - Files saved automatically
   - Build runs automatically (`runMainProject`)
   - If errors → Errors shown in chat
   - User asks to fix → GRIP fixes → Build runs again
   - **Loop until successful build** ✅

### Step 3: Merge to Main ❌ (NEEDS IMPLEMENTATION)
1. User satisfied with sandbox build
2. User clicks "Promote to Main" button
3. System shows preview of changes
4. User confirms → Files copied from `legalSandboxFiles` → `projectFiles`
5. Main project updated → User can continue in main project

---

## Implementation Plan

### 1. Create Promote/Merge API Route
**File:** `src/app/api/projects/[id]/promote-sandbox/route.ts`

**Functionality:**
- Takes sandbox project ID
- Gets all files from `legalSandboxFiles`
- Copies to `projectFiles` for main project
- Handles conflicts (overwrite or merge)
- Returns success status

### 2. Add UI Button
**File:** `src/app/dashboard/projects/[id]/page.tsx`

**Location:** In sandbox project view (when `isSandbox && parentProjectId`)
- Add "Promote to Main" button
- Show confirmation dialog
- Call promote API
- Navigate to main project after success

### 3. Add Promote Button in Sandbox List
**File:** `src/app/dashboard/projects/[id]/page.tsx`

**Location:** In "Sandbox Experiments" card
- Add "Promote" button next to "Open"
- Quick promote without opening sandbox

---

## Next Steps

1. ✅ Document current flow (this file)
2. ⏳ Implement promote API route
3. ⏳ Add UI buttons
4. ⏳ Create test script
5. ⏳ Test complete flow
