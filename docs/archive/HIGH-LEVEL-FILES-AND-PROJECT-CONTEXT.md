# High-level files and project-specific context

Mandatory high-level files (package.json, tsconfig.json, entry point) are made **project-specific** so the correct required code is generated to match the project and StackBlitz preview works.

## What we have in place to find project details

| Detail | Source | Where used |
|--------|--------|------------|
| **Project name** | `projects.title` (slugified) | package.json `name` |
| **Repo type** | `detectRepoType()` from `src/lib/repoTypeDetection.ts` using analysis `identity.project_type`, `file_manifest.paths`, `mainLanguages` | Framework/scripts choice; only web/full-stack get npm scripts |
| **Framework (Next vs Vite vs CRA)** | Structured analysis `identity.detected_frameworks`, `identity.project_type`, and paths (e.g. next.config, vite.config) | package.json `scripts` (dev, build, start) |
| **Entry point path** | Structured analysis `entrypoints[0].file` when present and JS/TS | Mandatory entry path (default `src/index.tsx`) |
| **Tech stack (dependencies)** | `projectAnalyzerService.determineTechStack()` from repo files (package.json, config files); plan/chat use this for recommendations | Plan generation and chat; dependencies in package.json should match code per `buildQualityPlan` |

## Where context is applied

- **`getProjectContextForHighLevelFiles(projectId)`** (`src/lib/services/highLevelFileContextService.ts`)  
  Fetches project title and analysis (structured analysis), infers framework and entry path, returns `{ projectName, devScript, buildScript, startScript, entryPath, framework, repoCategory }`.

- **`POST /api/projects/[id]/files/generate`**  
  Calls `getProjectContextForHighLevelFiles(id)` once per request. When generating **package.json** (template `package-json`), it injects `ProjectName`, `DevScript`, `BuildScript`, `StartScript` from this context so the generated file matches the project.

- **Script sets by framework** (in `highLevelFileContextService.ts`):  
  - **Next:** `next dev`, `next build`, `next start`  
  - **Vite:** `vite`, `tsc && vite build`, `vite preview`  
  - **CRA:** `react-scripts start`, `react-scripts build`  
  - **Generic (default):** same as Vite.

## Ensuring correct required code

- **Package.json and runnable builds:** `src/lib/constants/buildQualityPlan.ts` (`MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE`) is injected into plan and chat: dependencies must match imports, scripts must match the stack, valid JSON, no placeholders.
- **Chat/plan:** Enhanced chat and plan generator receive repo type rules from `getMandatoryRepoTypeRules()` so GRIP uses the right toolchain and scripts.
- **Post-generation:** `packageJsonService` resolves package.json from projectFiles or repo; export and Run in StackBlitz use normalized package.json (scripts, dependencies). Missing dependencies are expected to be fixed in chat (e.g. “add missing package to package.json”) per buildQualityPlan.

## Mandatory StackBlitz files (fixed list)

The mandatory list in `projectPlanningService.ts` is currently:

1. `package.json` — project name and scripts from context above.
2. `tsconfig.json` — shared TypeScript config (include `src`).
3. **`.env.example`** — env placeholders so the user can run in StackBlitz/local; generated when missing (see below).
4. `src/index.tsx` — default entry; analysis entrypoints can override in context for future use (e.g. dynamic mandatory entry path).

For **Next.js**, the runnable app uses `app/layout.tsx` and `app/page.tsx`; the plan should include those. `src/index.tsx` is still generated as a fallback entry for Vite/CRA-style previews when the plan doesn’t specify a different structure.

---

## When is .env.example generated and what goes in it?

### When it’s generated

- **Automation:** `.env.example` is in the mandatory StackBlitz list. When the user runs overview automation (or `POST /api/projects/[id]/files/generate`), `getFilesToGenerate` merges in `.env.example` if it’s missing, and the file generator creates it using the `env-example` template. So it is **generated and added to the project** in the same run as package.json, tsconfig, and the entry point.
- **Plan/chat:** The plan generator prompt asks the AI to include `.env.example` in the “files” array; chat is instructed (`MANDATORY_GRIP_ENV_AND_PRODUCTION_SETUP`) to create/update `.env.example` with placeholders and to point the user to Dashboard → Settings. So plan and chat can add or extend .env content in addition to the mandatory file.

### Settings → env mapping (GRIP adds these by automation)

The **env-example** template includes placeholders that map to what the user can copy from **Dashboard → Settings**:

| Variable | GRIP Settings location | Purpose |
|----------|------------------------|---------|
| `MONGODB_URI` | Backend connections (MongoDB) | DB for projects/chat/state; user’s saved `mongodbUri` |
| `ANTHROPIC_API_KEY` | AI API Keys | Chat, planning, code gen |
| `GITHUB_API_TOKEN` | System Integration (GitHub) | Export, repo sync; user’s saved `githubToken` |
| `VERCEL_TOKEN` | System Integration (Vercel) | Deploy to Vercel; user’s saved `vercelToken` |
| `VERCEL_TEAM_ID` | System Integration (Vercel) | Optional team; user’s saved `vercelTeamId` |

The template adds **comments** (e.g. “Copy from Dashboard → Settings → Backend connections”) so the user knows where to get values for StackBlitz preview or local run. GRIP does **not** write the user’s real secrets into the generated project; it only adds **placeholders and comments**.

### Project-specific content

- The **mandatory** `.env.example` includes the GRIP-related placeholders above plus a generic `NEXT_PUBLIC_APP_URL` and a line for project-specific vars (`ProjectSpecificVars` in the template; default empty).
- **Project-specific** vars (e.g. `VITE_API_URL`, `NEXT_PUBLIC_*`, custom API keys) are added by the **plan** or **chat** when the app needs them (per `buildQualityPlan`: use env vars, document in .env.example, no hardcoded secrets). The plan’s “files” array can include `.env.example` with a description, and chat can output an updated .env.example block when adding a new dependency or feature that requires env vars.
