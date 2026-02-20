# GRIP Full Automation Flow — Deep Analysis

## Executive summary

**Why the in-flight toast closes before “build” is complete:** The overview automation **does not run a build**. It ends after **file generation** (POST `files/generate`). The toast shows “done” as soon as that step finishes. There is no “run build” step in the overview flow.

**Why the overview shows “build phase” but nothing automated happens:** The overview displays **plan phases and steps** (e.g. “Phase 1: Setup”, “Run Build”) from project state. Phases now drive (1) **file generation** — POST `files/generate` loads project state and passes the current phase and its step titles into each file's template variables; (2) **Implement current phase** — a button links to Develop with `?implementCurrentPhase=1`, sending one user message so GRIP implements all steps in the current phase. The actual build (npm install + npm run build) **only runs inside enhanced chat** when code blocks are applied.

**Does enhanced chat affect autonomy?** Yes. The build is **only** triggered from the enhanced-chat route: when the user sends a message, the AI returns code blocks, the route applies them and then calls `runMainProject()`. So the “full” autonomous build (analysis → plan → files → **build**) was never implemented on the overview; only analysis → plan → files exist there.

---

## 1. Overview automation (project overview page)

**Location:** `src/app/dashboard/projects/[id]/page.tsx` — `useEffect` with `autoPlanRanRef`.

**Steps executed in order:**

| Step | setupStep value | What runs | When “done” |
|------|------------------|-----------|-------------|
| 0 | `preparing` | 1.8s delay | After delay |
| 1 | `analysis` | Poll GET `/api/projects/[id]/analysis/status` until `hasAnalysis` | When status says analysis complete (or 60s timeout) |
| 2 | `plan` | POST `/api/projects/[id]/plan`, then POST `plan/sync-state` | When both return OK |
| 3 | `files` | POST `/api/projects/[id]/files/generate` | When API returns (no build run) |
| 4 | `done` | Set state, show completion card | **Immediately after files/generate** |

**Gap:** There is **no step that runs the build**. As soon as `files/generate` returns, the code sets `setSetupStep('done')` and the in-flight toast shows “Automation completed”. So the toast closes (from the user’s perspective) “before the build” because the build is never started on the overview.

---

## 2. When does the build actually run?

**Only in enhanced chat.**

**Location:** `src/app/api/enhanced-chat/route.ts`.

**Flow:**

1. User sends a message to POST `/api/enhanced-chat`.
2. AI responds; route parses code blocks and calls `saveCodeBlocksToProject()`.
3. If any files were applied and `runAfterApply !== false`, the route calls `runBuildAndPersistErrors()`.
4. `runBuildAndPersistErrors()` calls `runMainProject(projectId, isSandbox)` (`src/lib/runMainProject.ts`).
5. `runMainProject()` uses `getProjectFilesForExport(projectId, { gripOnly: true })`, writes files to a temp dir, runs `npm install` then `npm run build`, and returns success/errors.

So:

- **Build execution** = `runMainProject()` (used only from enhanced-chat).
- **Overview** never calls `runMainProject()` or any “run build” API after file generation.

Result: the “build phase” on the overview is just the **plan** saying “Run Build” as a step; no automation on the overview runs that step. The user has to open **Develop** (enhanced chat) and trigger a response that applies code before any build runs.

---

## 3. Other “build” touchpoints

- **POST `/api/projects/actions`** with `action: 'run-build'`: Only **creates a task** in the `tasks` collection (e.g. `command: 'npm run build'`). It does **not** execute the build. A separate task runner would need to process that queue; the overview does not call this, and the flow that runs after file generation does not call it either.
- **`/api/projects/[id]/files/generate`**: Generates file content and writes to projectFiles (e.g. via `fileGeneratorService`). It does **not** run npm or any build.

---

## 4. What prevents full autonomous build from the overview?

1. **Overview automation ends at file generation.**  
   It never calls a “run build” API or `runMainProject()`, so the in-flight toast correctly shows “done” after files, but from the user’s perspective “build” never ran.

2. **Build is tied to enhanced chat.**  
   By design, the build runs only when the enhanced-chat route applies code and then calls `runBuildAndPersistErrors()`. So “automation” on the overview (analysis → plan → files) is separate from “build”; the latter only runs in the chat context.

3. **No “run build” API used by the overview.**  
   There is no route that the overview can call to “run the build once” after file generation. `runMainProject` exists in `lib/runMainProject.ts` but is only used by the enhanced-chat route.

4. **Possible race/visibility.**  
   If the user expects “build” to be part of the same automation, they may think the toast closed too early. In reality the toast closed when the only implemented automation (through files) finished; the build was never part of that flow.

---

## 5. Recommended fix (implemented)

To make the overview run the **full** flow including build:

1. **Add POST `/api/projects/[id]/run-build`**  
   - Calls `runMainProject(projectId, isSandbox)`.  
   - Returns `{ success, errors, output }` so the overview can show build result.

2. **Add a “build” step to the overview automation**  
   - After `files/generate`, set `setSetupStep('build')`.  
   - Call POST `/api/projects/[id]/run-build`.  
   - When it returns, then set `setSetupStep('done')` and show the completion card.

3. **Update the in-flight toast**  
   - Add a “Running build…” stage (e.g. Stage 5 of 6) so the user sees that the build is part of the same automation and the toast stays open until the build has run.

With this, the in-flight toast closes only after: preparing → analysis → plan → files → **build** → done, and the overview automation truly runs the full build phase autonomously.
