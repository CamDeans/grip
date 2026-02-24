# Repository analysis depth and AI enhancement opportunities

This doc describes how deep our GitHub repo analysis is today and where we can improve so the app (and Claude) can deliver the best results for complex use cases (e.g. bringing an existing codebase into an ideation and targeting a different platform or stack).

---

## Current analysis depth

### 1. Clone / fetch

- **Flow:** User links a GitHub repo to a project; we call `getOrCloneRepository(owner, repo, projectId)`.
- **What we get:** A list of repository files with `path`, `type`, and **full file content** where the GitHub API provides it (e.g. for non-binary files). So we do have raw file contents available after clone.

### 2. What we store (analysisService)

- **Stored in DB (e.g. `analyses`):**
  - **Repository structure:** For each file: `path`, `type`, `language` (from extension). Plus `totalFiles`, `languages` (counts by extension).
  - **Code structure:** `fileCount`, `directoryStructure` (list of paths), `mainLanguages`, `components` (currently empty), `features` (currently empty).
  - **Metrics:** `linesOfCode`, `averageFileSize`, `cyclomaticComplexity` (placeholder).
  - **Recommendations:** Static list (e.g. “Set up testing”, “Configure CI/CD”); not yet derived from the actual repo.

So today we **do not** persist per-file AI analysis or semantic “components”/“features” in this path; we store structure and metrics only.

### 3. Alternate path: `analyzeRepositoryStructure` (lib/analysis.ts)

- Uses GitHub content API (root-level files), filters to files with content.
- **Depth limit:** Only the **first 5 “key” files** are analyzed (root configs like `package.json`, `tsconfig.json`, plus a few `src/*` source files).
- For each of those 5 files we call `analyzeFile(content, path)` (AI) and then `generateProjectAnalysis(...)` (AI) once for the whole set.
- Output: `fileCount`, `directoryStructure`, `mainLanguages`, `fileAnalyses` (path + analysis text for those 5 files), `projectAnalysis` (one summary). **Components and features arrays are still empty.**

So in this path, Claude sees **summaries of 5 files** plus one project-level summary, not the full codebase.

### 4. What the chat actually receives (context for Claude)

- **Standard chat (`/api/ai/chat`):** Project title, description, ideation (goals, audience, features, technical requirements). If analysis exists: `fileCount`, `directoryStructure` (JSON). So the model sees **counts and paths**, not file bodies or rich semantic analysis.

- **Enhanced chat (`/api/enhanced-chat`):** Project + ideation plus:
  - **Repository analysis:** `totalFiles`, `languages`, “key project files” grouped by extension (up to 5 per type listed).
  - **Code structure:** `fileCount`, `components`, `features` (often empty), optional `mainEntryPoints`, `architecture`.
  - Instructions that the model can generate code that fits the repo and follows patterns.

So today:
- We **do** have full file contents in memory after clone in the analysis service path.
- We **do not** send full file contents to Claude in the system prompt; we send **structure, counts, file names, and (in one path) summaries of 5 files**.
- **Components / features / entry points / architecture** are either empty or not yet populated from real analysis, so the model has limited semantic context.

---

## Room for enhancements (to get the best results from Claude)

These are app-level improvements only (no use of your specific game/Expo example in logic or prompts).

### 1. Deeper and configurable file analysis

- **Current:** At most 5 files get AI analysis in `analyzeRepositoryStructure`; the rest are only paths and extensions.
- **Enhancement:** Increase the number of analyzed files or make it configurable (e.g. by project size or user setting). Optionally prioritize entry points (e.g. `index.*`, `App.*`, main HTML/JS) and key modules so the first N files are the most informative.

### 2. Put more repo content in the prompt (chunked)

- **Current:** Claude gets file paths and summaries, not full source.
- **Enhancement:** For projects that “pull in a GitHub repo” for ideation, add a step that selects a subset of important files (by path/extension/role) and includes their **content** in the context (truncated or chunked to stay within token limits). That way the model can reason about actual code when suggesting migrations, new features, or platform-specific ports.

### 3. Populate components and features

- **Current:** `codeStructure.components` and `codeStructure.features` are empty.
- **Enhancement:** Use static analysis (e.g. parse `import`/`export`, React components, or framework-specific patterns) or a small AI pass over the file list and key files to fill:
  - **Components:** e.g. React/Expo component names, custom elements, major UI modules.
  - **Features:** e.g. “auth”, “routing”, “state”, “API client”.
  This gives Claude a clear map of “what the app is made of” and improves suggestions for ports or refactors.

### 4. Target platform and migration intent in ideation

- **Current:** Ideation has goals, audience, key features, technical requirements. We don’t explicitly encode “source stack” vs “target stack” or “migrate from X to Y.”
- **Enhancement:** Extend ideation (and the prompts we build from it) with optional fields such as:
  - **Source stack / repo type** (e.g. “HTML/JS/CSS 2D game”).
  - **Target stack / platform** (e.g. “React Expo for mobile and desktop”).
  - **Migration / port intent** (e.g. “Port existing game to Expo with minimal behavior change”).
  Then the system prompt can state explicitly: “The user wants to take this [source] codebase and run it on [target]. Use the analyzed repo and ideation to suggest concrete steps and code.”

### 5. Structured analysis schema for the model

- **Current:** Analysis is a mix of free-form text and loose objects; components/features/entry points are optional and often missing.
- **Enhancement:** Define a small schema for “repository analysis for AI” (e.g. entry points, main frameworks, components, features, key configs, suggested migration steps) and always populate it from the analysis pipeline. Use this schema in the enhanced-chat system prompt so Claude consistently gets the same shape of context and can rely on it for code generation and planning.

### 6. Entry points and architecture

- **Current:** `mainEntryPoints` and `architecture` are optional and not consistently set.
- **Enhancement:** Detect entry files (e.g. `index.html`, `main.*`, `App.tsx`, `app.*`) and main scripts; optionally use AI or heuristics to label architecture (e.g. “SPA”, “multi-page”, “Expo”). Pass this into the prompt so the model knows “where the app starts” and “how it’s structured” when suggesting ports or new features.

---

## Repo reference document (implemented)

The app now analyzes the **complete repo stored in the DB** and builds a **reference document** that is submitted to Claude at the start of chat:

1. **When:** On the first message in enhanced chat for a project that has a linked repo, we call `getOrBuildRepoContextDocument(projectId)`.
2. **Source:** The full file list and contents from the `repositories` collection (the clone stored in DB).
3. **Content:** A single markdown document with directory structure plus file excerpts (truncated per file and overall to stay within token limits). Up to 50 files, ~4k chars per file, ~28k chars in the prompt.
4. **Storage:** The document is stored in the `analyses` collection as `projectContextDocument` so it can be reused for subsequent messages without rebuilding.
5. **Refresh:** Call `POST /api/projects/[id]/repo-context` to rebuild the document (e.g. after re-cloning or when the repo content changes).

This gives Claude a single, consistent reference to the full codebase at chat start instead of only structure and a few file summaries.

---

## Summary

- **How in-depth is our analyzing today?** We have full file list and content after clone, but we only run AI on a small number of files (5 in one path) and send the model **structure, counts, file names, and limited summaries**—not full file bodies. Components/features and deep semantic analysis are largely unused or empty.
- **Is there room for enhancements?** Yes. The biggest levers are: (1) sending more file content (chunked) to Claude, (2) populating components/features/entry points/architecture from the repo, (3) encoding source/target platform and migration intent in ideation and prompts, and (4) using a consistent analysis schema so the model always gets the same kind of context. Implementing these would help the app support complex flows (e.g. bringing in an existing codebase and targeting a different platform) at a higher level without changing the general “create project → link repo → analyze → chat” flow.
