# GRIP and Sandbox GRIP Parity

This doc describes how enhancements apply to **both** main GRIP (main project) and **Sandbox GRIP** (sandbox experiments), and lists strengthening suggestions for both tools.

---

## Parity Checklist (Both Tools)

| Feature | Main GRIP | Sandbox GRIP |
|--------|-----------|---------------|
| **Enhanced chat** | ✅ Same route, `projectId` from `projects` | ✅ Same route, `projectId` from `sandboxProjects` |
| **Analysis** | `analyses` + tree-sitter | `sandboxAnalyses` + tree-sitter |
| **Repo context** | `getOrBuildRepoContextDocument(projectId, false)` | `getOrBuildRepoContextDocument(projectId, true)` |
| **Priority paths in repo reference** | route_map, entrypoints, recommended_integration_points first | Same |
| **Ideation enhancement** | Main ideation → enhancedBuildRequirements (main) | Sandbox ideation → enhancedBuildRequirements on sandbox |
| **Project state in prompt** | `projectStates` (phases/steps) | Derived from `legalSandboxPlans` (phases/tasks) |
| **Implemented routes/entrypoints** | `projectStates.implementedRoutePaths` / `implementedEntrypointPaths` | `sandboxProjects.implementedRoutePaths` / `implementedEntrypointPaths` |
| **Persist implemented after save** | ✅ After `saveCodeBlocksToProject` (main) | ✅ After `saveCodeBlocksToProject` (sandbox) |
| **Persist implemented on retry** | ✅ In retry path (main) | ✅ In retry path (sandbox) |
| **Likely remaining** | Excludes implemented routes/entrypoints | Same |
| **Analysis refresh** | `POST /api/projects/[id]/analysis/refresh` | `POST /api/projects/[id]/analysis/refresh?sandbox=true` |
| **Last-attempt summary when build failed** | ✅ Passed into retry prompt | ✅ Same |
| **Single dev script hint in plan** | Main plan generator | Sandbox plan: phase/task for root dev script when repo has frontend+backend |
| **.cursorrules** | Prefer "Likely remaining", no duplicate work | Same rules apply in chat |
| **User uploads** | `projectFiles` with `metadata.generatedBy: 'user_upload'`; GET/POST `/api/projects/[id]/uploads` | `legalSandboxFiles` same metadata; GET/POST `/api/projects/[id]/legal-sandbox/uploads` |

---

## User Uploads (Images and Reference Docs)

Both GRIP and Sandbox GRIP support **user uploads** so the user can provide their own images (hero, logo, favicon) and reference docs (specs, copy, PDFs) for the build.

- **Storage:** Main project → `projectFiles` with `metadata: { generatedBy: 'user_upload', purpose: 'image' | 'reference_doc' }`. Sandbox → `legalSandboxFiles` with the same metadata.
- **Paths:** Images default to `public/` (e.g. `public/hero.png`); reference docs to `docs/` (e.g. `docs/spec.txt`). GRIP is told to use these paths in code and to use docs for requirements/copy.
- **APIs:** GET/POST `/api/projects/[id]/uploads` (main), GET/POST `/api/projects/[id]/legal-sandbox/uploads` (sandbox). POST accepts multipart/form-data (`files` or `file`). Allowed: PNG, JPEG, GIF, WebP, ICO, BMP; PDF, TXT, MD. Max 4MB per file.
- **Enhanced chat:** User uploads are listed in the system prompt under "User uploads (use in the build)" so GRIP uses image paths in `<img>`, CSS, or imports and uses reference docs for requirements or copy.
- **Overview:** "Your uploads" card on the project Overview page (main and sandbox) with file picker and list of uploads.

---

## Strengthening Suggestions (Both Tools)

### Identity and connectivity
- **GRIP identity**: Chat system prompt states GRIP only; do not claim or reference other AI products. Applies to both main and sandbox chat.
- **Anthropic / enhanced chat**: Assume Anthropic is the primary backend for enhanced chat. Add retry (e.g. one retry with backoff) for the Anthropic API call so transient failures don’t immediately break chat. Optionally show a clear UI message when the assistant is temporarily unavailable.

### Code and files
- **Reuse existing code**: Prefer editing and reusing files/code already in the codebase unless the user explicitly requests new files or the feature cannot be implemented in existing files.
- **Likely remaining**: When the system provides a "Likely remaining to implement" list, GRIP (main and sandbox) should prefer implementing those items before adding new features and should not duplicate work already in project files.

### Data and types
- **Typing**: Add `implementedRoutePaths?: string[]` and `implementedEntrypointPaths?: string[]` to project state types (main: `IProjectStateData` / schema; sandbox: document in `sandboxProjects`) so they are first-class.
- **projectId format**: Use ObjectId for `projectId` in `sandboxAnalyses` and `legalSandboxPlans`. Run the migration script once: `src/scripts/migrate-sandbox-projectid-to-objectid.ts`. Queries already support both string and ObjectId via `$or` where needed.

### APIs and UI
- **Analysis refresh**: Call refresh when the user or UI requests a fresh analysis (e.g. "Re-analyze repo" button). Main: no query param. Sandbox: `?sandbox=true`.
- **Run / build**: Both main and sandbox run build after apply; errors are persisted and fed into the next prompt (and retry). Same flow for both.

### Testing and docs
- **Tests**: Prefer unit tests for "likely remaining" exclusion (given `implementedRoutePaths` / `implementedEntrypointPaths`, those items don’t appear). Optional integration test for analysis refresh (main and sandbox) that next chat load gets fresh context.
- **Docs**: Point README or dev docs to this parity doc and to the analysis refresh endpoint (main + sandbox query param).

---

## File References

- **Enhanced chat**: `src/app/api/enhanced-chat/route.ts` — single entry for main and sandbox; `isSandbox` branches for project source, analysis collection, state, and persist targets.
- **Analysis refresh**: `src/app/api/projects/[id]/analysis/refresh/route.ts` — main vs sandbox via `?sandbox=true`.
- **Repo context**: `src/lib/services/repoContextService.ts` — `getOrBuildRepoContextDocument(projectId, isSandbox)`.
- **Sandbox plan**: `src/app/api/projects/[id]/legal-sandbox/plan/route.ts` — single dev script hint for frontend+backend repos.
- **Migration**: `src/scripts/migrate-sandbox-projectid-to-objectid.ts` — one-time normalize `projectId` to ObjectId in sandbox collections.
- **User uploads**: `src/lib/uploadValidation.ts` — allowed MIME/types, max size, purpose/path. Main: `src/app/api/projects/[id]/uploads/route.ts`. Sandbox: `src/app/api/projects/[id]/legal-sandbox/uploads/route.ts`. Overview "Your uploads" card: `src/app/dashboard/projects/[id]/page.tsx`.
