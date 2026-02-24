# Transitioning Sandbox GRIP to Main GRIP App

This doc outlines how to move sandbox-style behavior (repo as analysis + dependency only, new code only) into the main GRIP app **without changing the frontend** — only backend and data usage.

## Goal

- **Frontend:** Unchanged. Same dashboard, project flow, Develop (chat), Preview, Repo tab, etc.
- **Backend:** Switch to "legal-safe" mode: use repo for **analysis and dependency reference only**; **generate new code only**; never copy repo source into project files. Export/preview use only generated files.

## What Stays the Same (Frontend)

- Project creation flow (form, repo selector, ideation).
- Overview, Setup, Repo, Develop (chat), Preview tabs and layout.
- Chat UI (EnhancedChatInterface, FormattedMessage, Save to project).
- Preview: Run in StackBlitz, download, export to GitHub, deploy.
- Repo tab: can stay as "reference" (structure/readme) or show "Reference only — GRIP generates new code."

## Backend-Only Changes

### 1. Project / file model

- **Today (main):** Project may have cloned repo files + generated files mixed (e.g. projectFiles, repo clone).
- **Transition:** Separate "generated files" (GRIP-only) from "repo reference." Store generated files in a single source of truth (e.g. same shape as `legalSandboxFiles`: path, filename, content). Repo is used only for analysis and as a dependency reference; repo file contents are not stored as project files.

**Options:**

- **A)** Add a `repoUsage: 'clone' | 'referenceOnly'` (or `legalSafeMode: boolean`) to project. When `referenceOnly`, all "Save to project" and generated files go to a generated-files store only; export/preview use only that store.
- **B)** Migrate main app fully to "reference only": always use generated-files store for project output; repo is analysis + dependency only. (Largest change.)

### 2. Analysis

- **No frontend change.** Keep same analysis API and UI (run analysis, show status).
- **Backend:** Analysis already produces structure/patterns. In legal-safe mode, that result is used only for planning and context; it is not used to copy repo files into the project. No change to analysis API contract.

### 3. Chat (Develop) and "Save to project"

- **Frontend:** Unchanged. Same "Save to project" button, same FormattedMessage.
- **Backend:**
  - **System prompt:** When in legal-safe mode, use the sandbox-style system prompt: repo as reference only, generate new code only, full path above every code block, no generic filenames, grip-actions for create_folder with a line above stating the folder path.
  - **Save target:** When in legal-safe mode, "Save to project" writes to the **generated-files store** only (same behavior as sandbox `legalSandboxFiles`), not into cloned repo or mixed project files.
  - **Chat history:** Already persisted (main app has chat history). No change needed for persistence.

### 4. Export / Preview / StackBlitz

- **Frontend:** Unchanged. Same "Run in StackBlitz", "Export to GitHub", "Download."
- **Backend:** When in legal-safe mode, export-files and preflight use **only the generated-files store** (same as sandbox export-files). StackBlitz and download get only GRIP-generated files; no repo source included.

### 5. Repo tab

- **Option A:** Keep showing repo structure/readme for reference; make it clear "Reference only — GRIP generates new code; repo is not copied."
- **Option B:** Hide or disable "use repo files in build" and show only "Generated files" in the file tree. No frontend layout change; only what data is shown.

## Implementation Order (Backend Only)

1. **Add project flag:** e.g. `repoUsage: 'referenceOnly'` or `legalSafeMode: true` (per project or global).
2. **Generated-files store:** Reuse or mirror sandbox pattern: one collection (or equivalent) keyed by projectId with path, filename, content. All "Save to project" in legal-safe mode write here.
3. **Enhanced-chat route:** If project is reference-only, (a) use sandbox-style system prompt, (b) route save-from-chat to generated-files store.
4. **Export-files / preflight:** If project is reference-only, build export from generated-files store only (same as sandbox).
5. **Repo tab / project tree:** When reference-only, show only generated files as "project files"; repo remains reference-only in UI copy and data.

## Difficulty

- **Medium.** Most work is backend: one new or repurposed store for "generated files only," a project flag, and branching in chat (prompt + save target), export-files, and preflight. Frontend can stay as-is; optionally add a single setting (e.g. "Use repo as reference only (legal-safe)") that sets the flag so the backend switches mode.

## Sandbox as Prototype

The sandbox already implements:

- Generated-files-only store (`legalSandboxFiles`).
- Sandbox chat with legal-safe prompt and save to that store.
- Export-files/preflight from that store only.
- Chat history persistence.
- Grip-actions create_folder with line above; file path above every file block.

Moving to main app = reusing these behaviors behind a "reference only" flag and wiring main app APIs (enhanced-chat, export-files, project-files) to the same logic when the flag is on, **without changing the frontend**.
