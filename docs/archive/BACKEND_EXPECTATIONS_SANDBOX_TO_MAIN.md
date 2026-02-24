# Backend expectations: Sandbox → Main GRIP app

When sandbox features are stable, these backend and flow changes should be ported to the main GRIP app.

**Important:** The main GRIP app must **not** be changed until we swap backend, analysis, and expected outcomes from sandbox to main. Main GRIP already produces beautiful designs and outputs; we reuse its concepts (e.g. file hierarchy, phases) in sandbox prompts and flow, but do not modify main GRIP code until the transition.

---

## 1. L3 file structure and pages (mandatory)

- **Definition:** L3 = multi-page app structure: multiple pages/screens/routes (e.g. `app/dashboard`, `app/settings`, `pages/about`), shared layouts, and clear navigation—**not** a single landing page unless the user explicitly asks.
- **Where enforced (sandbox):**
  - **Ideation → technical prompt** (`ideationToTechnicalPrompt.ts`): Analysis prompt includes "L3 file structure and pages (mandatory)" and "beat typical dev tools and other SaaS."
  - **Plan** (`legal-sandbox/plan/route.ts`): System prompt states plan must target multi-page structure; no single-landing-only unless user asked.
  - **Chat** (`legal-sandbox/chat/route.ts`): System prompt mandates multi-page generation and use of analysis/plan for best-in-class output.
- **Expected outcome:** Sandbox outputs are top-notch, beat other dev tools, and feel separate from the rest. When porting to main, carry these mandates into main GRIP's plan and chat prompts so the same bar applies.

---

## 2. Top-level analysis and full tree-sitter use

- **Sandbox behavior:**
  - **Top-level structure summary:** `treeSitterAnalysis.ts` builds a "Top-level structure (for L3 / multi-page generation)" section from paths: routes/pages, layouts, component files, key directories. This is appended to the raw AST summary so the model gets L3-relevant context.
  - **Project analysis prompt:** `buildProjectAnalysisWithPrompt()` asks for a top-level architecture synthesis (routes, pages, layouts), L3-style structure summary or recommendation, and highest-capability use of the AST. Analysis drives L3-compliant generation.
- **What to port:** When moving to main, ensure analysis produces (or consumes) a similar top-level structure summary and that plan/chat prompts expect L3 and best-in-class output.

---

## 3. Tree-sitter analysis (sandbox → main)

- **Location (sandbox):** `src/lib/sandbox/treeSitterAnalysis.ts`, `src/lib/sandbox/treeSitterNative.ts`, `src/lib/sandbox/treeSitterLoader.cjs`
- **What to port:**
  - Use **native tree-sitter** (optionalDependencies: `tree-sitter`, `tree-sitter-javascript`, `tree-sitter-typescript`) with the **.cjs loader** pattern so Next/Webpack does not evaluate `createRequire` at build time.
  - Call **`loadNativeTreeSitterAsync()`** once at the start of analysis; then use **`parseWithTreeSitter()`** per file with Babel/TS-estree fallback when native fails.
  - **Ideation → technical prompt:** `src/lib/sandbox/ideationToTechnicalPrompt.ts` — advance user plain-English ideation to a technical analysis prompt via Anthropic; use that prompt to shape project-level analysis.
  - **Repo separation:** Only analyze the user's linked repo (owner/name from project). Never analyze or reference GRIP codebase in analysis.
- **Main app today:** `src/lib/analysis.ts` uses Anthropic per-file and no tree-sitter. Replace or augment with tree-sitter + ideation prompt when porting.

---

## 4. Auto-apply files (GRIP controls the build)

- **Sandbox behavior:** All file code blocks from the assistant are **saved automatically** to the sandbox (no user “Save” step). Chat context is **change requirements and errors only**.
- **What to port:**
  - Backend: Continue to parse code blocks and write to project/sandbox store in one go (already done in sandbox chat route).
  - System prompt: State that “Files you output are applied automatically; user does not save manually. User chat is for change requirements and errors only.”
  - Response shape: Return **`appliedPaths`** (and optionally **`runErrors`**) so the UI can show “Applied” and trigger run/error flow.
- **Main app:** Enhanced chat and file update flow currently expect user to “Save to project” on blocks. Add an option or default to auto-apply and adjust prompts accordingly.

---

## 5. Backend run + terminal errors as next-step phases

- **Sandbox behavior:**
  - After applying files, the backend can **run the project** in a temp dir (`npm install` + `npm run build` or `npm run dev` with timeout).
  - Terminal/build errors are captured and returned as **`runErrors`** in the chat response.
  - The frontend automatically sends a follow-up message: “The build reported these errors. Please fix them: …” so GRIP fixes without the user copying errors.
- **Location (sandbox):** `src/lib/sandbox/runSandboxProject.ts`, `POST /api/projects/[id]/legal-sandbox/run`, chat route with **`runAfterApply`** and **`runErrors`**.
- **What to port:**
  - **Run service:** A backend script or API that, given project files, runs `npm install` and `npm run build` (or dev with timeout) in a temp dir or container, and returns **`{ success, errors[], output }`**.
  - **Chat integration:** Optional **`runAfterApply`** (or equivalent) so that after saving code blocks, the backend runs the project and appends **`runErrors`** to the response. Frontend uses **`runErrors`** to auto-send a fix request.
  - **StackBlitz note:** In sandbox we use a **temp-dir run** (no StackBlitz server API). When porting to main, you can keep this or replace with a StackBlitz server/headless API if one becomes available.
- **Main app:** Add a similar run step (temp dir or dedicated runner) and wire run errors into enhanced chat as automated “next step” phases.

---

## 6. Checklist for main GRIP port

- [ ] L3 file structure: plan and chat prompts mandate multi-page structure; no single-landing unless user asked; beat-other-tools bar.
- [ ] Top-level analysis: structure summary (routes/pages/layouts) and top-level synthesis in project analysis; full tree-sitter use.
- [ ] Tree-sitter: optionalDependencies + .cjs loader; `loadNativeTreeSitterAsync` + Babel fallback in analysis.
- [ ] Ideation → technical prompt: call before analysis and pass technical prompt into project-level analysis.
- [ ] Repo separation: only user repo (owner/name); never GRIP code in analysis.
- [ ] Auto-apply: system prompt and backend behavior so files are applied without manual save; chat for changes and errors only.
- [ ] Response shape: `appliedPaths` (and `runErrors` when run is used).
- [ ] Backend run: script/API that runs project (temp dir or runner), returns `errors`/`output`.
- [ ] Run-after-apply: optional flag to run after applying files and return `runErrors`.
- [ ] Frontend: when `runErrors` present, auto-send fix message so user does not paste errors manually.
