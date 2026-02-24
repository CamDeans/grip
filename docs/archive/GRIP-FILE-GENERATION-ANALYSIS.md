# GRIP File Generation — Deep Analysis and Plan-Driven Build

## How the "3 files" were produced (before change)

1. **Structure**  
   The project structure (`projectStructures.fileHierarchy`) comes from analysis: `projectAnalyzerService` / `structureGeneratorService` build a tree of **directories** (and optionally files). Often the analyzer only creates directory nodes (e.g. `src`, `src/lib`, `src/lib/utils`), with no explicit file nodes.

2. **getFilesToGenerate** (`projectPlanningService`)  
   - First walks `structure.fileHierarchy` and collects any nodes with `type === 'file'`.  
   - If there are **zero** file nodes, it runs **addSyntheticFromDirs**: for each non-root directory it creates **one synthetic file** — `page.tsx` for `app`/`pages` dirs, otherwise `index.tsx`.  
   - So with directories `src`, `src/lib`, `src/lib/utils` you get exactly **3 files**:  
     - `src/index.tsx`  
     - `src/lib/index.tsx`  
     - `src/lib/utils/index.tsx`  
   - That list is **independent of the build phases** (Setup, Base Infrastructure, Feature Implementation, etc.). Phases and tasks were only used for display and for phase context in template variables, not for deciding which files to create.

3. **files/generate**  
   `POST /api/projects/[id]/files/generate` calls `getFilesToGenerate(projectId)` and then generates each file with templates + phase context. So GRIP was effectively “focused” on that fixed set of structure-derived files (the “3 files”) instead of the full set of files implied by the build phases.

4. **Why phases didn’t drive files**  
   The plan (phases + tasks) lived only in `developmentPlans` and was used for:  
   - UI (Build phases card)  
   - Phase context in template variable generation  
   It did **not** define which files to generate. File list = structure-only.

---

## What was changed: plan-driven file list and single run

### 1. Plan contains full file list (`suggestedFiles`)

- **DevelopmentPlan** now has an optional **`suggestedFiles`**: list of `{ path, phaseId?, taskId?, description? }`.
- **addTasksToPhases** (plan generator) asks the AI for a **`files`** array in the same JSON as phases/tasks: “every file path that should be created to implement this plan in one run.”
- The AI returns phases, tasks, **and** files (e.g. `package.json`, `src/app/layout.tsx`, `.env.local`, API routes, etc.). We parse and store `suggestedFiles` on the plan when present.

### 2. File generation uses plan files when present

- **getFilesToGenerate(projectId)** now:
  1. Loads the plan (`getDevelopmentPlan(projectId)`).
  2. If **`plan.suggestedFiles?.length > 0`**, it **returns file nodes built from `suggestedFiles`** (path, name, generationMetadata with phase/task), so the full build file set is driven by the plan.
  3. Otherwise it keeps the **previous behavior**: structure-based collection + synthetic files from directories (the “3 files” fallback).

So GRIP **stops treating “the 3 structure-derived files” as its own task**: when the plan has `suggestedFiles`, generation is for the **plan’s full file list** in one run.

### 3. Same run for the complete build

- **files/generate** was already a single run: it loops over whatever `getFilesToGenerate` returns and generates each file (with phase context).  
- The only change is **what** that list is:  
  - **Before**: always the structure-derived list (e.g. 3 files).  
  - **After**: when the plan has `suggestedFiles`, that full list is used so **all file and code generations for the complete build happen in the same run** (one `POST /api/projects/[id]/files/generate` call generating all plan files).

### 4. Backward compatibility

- **Existing plans** without `suggestedFiles` still use the structure-based logic (the “3 files” behavior).
- **New plans** get `suggestedFiles` from the AI and use the full plan-driven list.
- If the AI does not return a valid `files` array, the plan has no `suggestedFiles` and we fall back to structure as before.

---

## Summary

| Before | After |
|--------|--------|
| File list = structure only (e.g. one file per directory → “3 files”) | File list = plan’s `suggestedFiles` when present (full build file set) |
| Phases/tasks only for display and template context | Phases/tasks also define which files to generate (via AI-generated `files` in plan) |
| GRIP “focused” on the 3 structure-derived files | GRIP focuses on the full build phases file list in one run |
| Same API, one run | Same API, one run; list content is plan-driven when available |

---

## Mandatory rule: GRIP creates all code for all file creations — no matter what

- **Rule:** GRIP MUST generate **full, runnable code** for **every** file that is created or listed in the plan or build. No exceptions. No skipping files. No placeholders, no empty files, no comment-only stubs.
- **Where it's enforced:**
  - **Plan generation** (`planGeneratorService`, `buildQualityPlan.ts`): `MANDATORY_GRIP_ALL_CODE_FOR_ALL_FILES` is injected into the AI prompt so plans and "files" arrays assume every listed file gets full code.
  - **deriveSuggestedFilesFromPlan:** Prompt states that every file in the list will be generated with full code; only list files for which full implementations can be provided.
  - **Template variable generation** (`templateEngineService.generateTemplateVariables`): Prompt states that variable values must produce complete content—never placeholder or empty.
  - **File generation** (`fileGeneratorService.generateFile`): `isPlaceholderOrEmpty()` rejects empty/placeholder content; the file is not saved and generation returns failure with a message referencing the mandatory rule.
  - **files/generate route:** When any file fails, the route logs a warning and includes `mandatoryRuleMessage` in the response/stream so the client can surface "GRIP mandatory: every file must have code; N file(s) failed."
- **Outcome:** Every file in the plan/build either gets real code (and is saved) or generation fails for that file and the user sees the error and the mandatory-rule message. No file is ever persisted with empty or placeholder-only content.

All file and code generation for the user’s project build now happens in the same run using the full file list outlined in the build phases (when the plan includes `suggestedFiles`).
