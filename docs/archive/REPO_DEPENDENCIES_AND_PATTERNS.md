# Repo Dependencies and Pattern Alignment

## How we handle repo dependencies today

### 1. **Repo context includes real file contents**

- When the user connects a GitHub repo, we clone it and store files in the `repositories` collection.
- For each chat (Develop), we build a **repository reference document** via `getOrBuildRepoContextDocument` (see `src/lib/services/repoContextService.ts`). That document includes:
  - Repo directory structure
  - **Actual file contents** from the repo (up to 50 files, ~4K chars each, ~35K total). So **package.json and other repo files are in context** when they’re in that set.
- The document is stored in `analyses.projectContextDocument` (main) or `sandboxAnalyses.projectContextDocument` (sandbox) and passed into the enhanced-chat system prompt as “Repository reference”.

### 2. **package.json and lockfiles are prioritized**

- So that GRIP always sees repo dependencies, we **prioritize** these paths when building the repo context:
  - `package.json`
  - `package-lock.json`
  - `yarn.lock`
  - `pnpm-lock.yaml`
- Tree-sitter–derived paths (route source files, entrypoints, recommended integration points) are also prioritized. So **repo package.json is included first** when present, and GRIP can reuse the same dependency names and versions for pattern alignment.

### 3. **Instructions to GRIP**

- We tell GRIP to:
  - **Use the project’s current package.json from context** (repository reference or project files) and **merge** in new dependencies/scripts instead of inventing from scratch.
  - **Reuse repo dependencies for pattern alignment:** when the linked repo uses specific packages (e.g. text-to-image, text-to-video, APIs), use those **same package names and compatible versions** in the project’s package.json so generated code aligns with the repo; only use different packages if the user explicitly asks.
  - “Include imports that match the dependencies used in the repository.”
  - If the repo or project has a lockfile, prefer that package manager and keep version ranges consistent.

### 4. **Terminal / install flow**

- When the user (or automation) runs `npm install <pkg>` in the terminal, we resolve package.json via `packageJsonService.getPackageJsonForProject`: **projectFiles first, then repo**. So we **do** reuse the repo’s package.json when the project doesn’t have one yet, and we merge new installs into that.

## Summary

- **Pattern match:** We use **repo structure and patterns** (from analysis + full repo reference doc). We **do** include repo file contents (so package.json and lockfiles are in context and prioritized).
- **Reusing dependencies:** We instruct GRIP to **reuse the same dependency names and versions** from the repo for alignment (e.g. text-to-image, text-to-video); we do **not** tell GRIP to find and create all new dependencies from scratch. If the user connects a repo that uses e.g. `@fal-ai/client` or `replicate`, GRIP should use those in the project’s package.json unless the user asks for something else.
- **Gaps we closed:** (1) package.json and lockfiles are now explicitly prioritized in the repo context so they’re always present when building the reference. (2) An explicit prompt rule was added to reuse repo dependencies for pattern alignment.

## Where this lives in code

- **Repo context (what gets sent to GRIP):** `src/lib/services/repoContextService.ts` — `buildRepoContextDocument`, `getOrBuildRepoContextDocument`; priority paths include `package.json` and lockfiles.
- **Prompt rules (reuse repo deps, use package.json from context):** `src/app/api/enhanced-chat/route.ts` — “Use the project’s current package.json from context…”, “Reuse repo dependencies for pattern alignment…”, and `src/lib/constants/buildQualityPlan.ts` — lockfile/package manager and dependency rules.
- **Resolving package.json for installs:** `src/lib/services/packageJsonService.ts` — `getPackageJsonForProject` (projectFiles first, then repo).
