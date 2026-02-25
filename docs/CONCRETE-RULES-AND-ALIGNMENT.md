# Concrete Rules and Codebase Alignment

This doc lists all Cursor rules in `.cursor/rules/` and where GRIP's code enforces them. Use it to verify alignment before/after changes.

---

## Mandatory process rule (source of truth and changes)

**We work only from this file and `.cursorrules`.** All GRIP behavior, rules, and alignment are defined and tracked here and in `.cursorrules`. No other doc or rule set overrides these two.

**Before updating either file:** Every change to `docs/CONCRETE-RULES-AND-ALIGNMENT.md` or `.cursorrules` must be **verified and confirmed** (e.g. proposed, then approved) so we stay on track and on the same page. Do not edit these two files without that confirmation.

---

## Rule index (15 rules, all `alwaysApply: true`)

| # | Rule file | One-line summary |
|---|-----------|------------------|
| 1 | grip-all-code-for-all-files.mdc | Full runnable code for every file; no placeholders/empty |
| 2 | full-grip-build.mdc | 100% functioning app; **mandatory flow fully automated:** create project → analyze → plan → build → create files → write all code; export, deploy, preview, full repo, chat-to-files; no future deferrals |
| 3 | stackblitz-mandatory-files.mdc | package.json, tsconfig, .env.example, entry point; runnable package.json |
| 4 | build-artifacts-align-with-code.mdc | **package.json and all build artifacts must concretely align with the code** (deps match imports; scripts match framework; tsconfig match paths) |
| 5 | repo-types-mandate.mdc | Handle ALL repo types; category rules from repoTypeDetection |
| 6 | clean-room-code-generation.mdc | Linked repo reference only; never copy/paste repo source |
| 7 | code-and-file-reuse.mdc | Reuse services/APIs; extend don't duplicate |
| 8 | grip-identity-and-env.mdc | You are G.R.I.P.; .env/Vercel only; Settings for user's build |
| 9 | user-uploads-must-use.mdc | When user uploads images/docs, MUST use them in code |
| 10 | no-mock-data-production-ready.mdc | No mock data; DB setup when persistence indicated |
| 11 | project-specific-scaffolding.mdc | Project-specific package/tsconfig/README; no Vite by default |
| 12 | repo-separation.mdc | Analysis/repo context for user's repo only; never GRIP codebase |
| 13 | sandbox-parity.mdc | Same rules for main and sandbox (identity, clean-room, repo type, uploads) |
| 14 | likely-remaining-preference.mdc | Prefer "Likely remaining" before new features; no duplicate work |
| 15 | phase-completion-revert.mdc | When user says not meeting phase completions, revert-and-fix until aligned |

---

## Where each rule is enforced (code locations)

| Rule | Primary code locations |
|------|-------------------------|
| grip-all-code-for-all-files | Full code for every file; Overview automation does not stop until every file has full code or reported failure. `buildQualityPlan.ts` MANDATORY_GRIP_ALL_CODE_FOR_ALL_FILES; `planGeneratorService`; `fileGeneratorService` isPlaceholderOrEmpty; `files/generate` loop over all files, mandatoryRuleMessage |
| full-grip-build | **Mandatory flow before enhanced chat:** project creation → analyze (all pipeline steps); analysis results → Anthropic (plan + file gen); Overview in-flight modal runs plan → files/generate (every file, full code) → build autonomously; GRIP runs until all file creations have full code (concrete rule). Code: `src/app/api/projects/route.ts` (create + analyzeProject); `analysisService` (repo clone, ideation→prompt, tree-sitter); `planGeneratorService` + `fileGeneratorService` read analyses; `src/app/dashboard/projects/[id]/page.tsx` setupStep + POST analysis/refresh when no analysis; `files/generate` loop over all files, mandatoryRuleMessage on failure. Export/deploy/preview/repo; `FULL-BUILD-REQUIREMENTS.md`. |
| stackblitz-mandatory-files | `projectPlanningService` ensureMandatoryStackBlitzFiles, MANDATORY_STACKBLITZ_FILES; `buildQualityPlan` MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE; enhanced-chat injects |
| build-artifacts-align-with-code | **Concrete:** package.json/tsconfig/.env must align with code. `buildQualityPlan.ts` MANDATORY_GRIP_BUILD_ARTIFACTS_ALIGN_WITH_CODE; enhanced-chat + legal-sandbox chat inject it; `highLevelFileContextService` infers framework/scripts from analysis; `validatePackageJsonForStackBlitz` in preflight and **after files/generate** (stream + JSON response include `buildArtifactAlignment`); `normalizePackageJsonScriptsForStack` on export |
| repo-types-mandate | `repoTypeDetection.ts` getMandatoryRepoTypeRules, detectRepoType; enhanced-chat injects repoTypeRules |
| clean-room-code-generation | enhanced-chat "reference only", "clean-room", "do not copy"; planContextFromAnalysisService; legal-sandbox chat/plan |
| code-and-file-reuse | Centralized services (anthropicService, fileGeneratorService, etc.); no duplicate chat/task/file paths |
| grip-identity-and-env | enhanced-chat buildSystemPrompt "You are G.R.I.P."; MANDATORY_GRIP_APP_VS_USER_SETTINGS; anthropicService.initialize + createMessage |
| user-uploads-must-use | enhanced-chat buildSystemPrompt "You MUST use them" + userUploadsSummary; plan generator "User uploads (use in implementation)" |
| no-mock-data-production-ready | buildQualityPlan MANDATORY_GRIP_BUILD_QUALITY (no mock + DB when persistence); plan + enhanced-chat |
| project-specific-scaffolding | buildQualityPlan MANDATORY_GRIP_ONLY_REQUIRED_PACKAGE_AND_BUILD, MANDATORY_GRIP_PROJECT_SPECIFIC_SCAFFOLDING; plan + enhanced-chat |
| repo-separation | treeSitterAnalysis.ts, treeSitterNative.ts "user's linked repo only; never GRIP codebase"; repoContextService |
| sandbox-parity | enhanced-chat single route + isSandbox; same buildSystemPrompt and mandatory blocks for main and sandbox when using enhanced-chat |
| likely-remaining-preference | enhanced-chat injects "Likely remaining to implement" + "Prefer implementing these when..."; likelyRemaining built from checklist minus implemented |
| phase-completion-revert | enhanced-chat buildSystemPrompt revert-and-rerun block when user says not meeting phase completions |

---

## Full automation concrete requirements (full-grip-build)

These are the concrete requirements for the mandatory flow; code must align so users do not waste tokens on false or partial results.

1. **Project creation and analysis using all pipeline steps ("all middles")** — On create (with repo) or when opening Overview with linked repo but no analysis, GRIP runs full analysis: repo clone, ideation-based technical prompt, tree-sitter/structured analysis. Enforced: `analysisService.analyzeProject` (getOrCloneRepository, buildTechnicalAnalysisPromptFromIdeation, analyzeRepositoryStructureWithTreeSitter); project create calls it; Overview calls POST `analysis/refresh` when `!hasAnalysis` then polls status.

2. **Analysis results sent to Anthropic API calls** — Stored analysis (repositoryAnalysis, structuredAnalysis) is input to plan generation and file generation. Enforced: `planGeneratorService` reads `analyses` and uses `buildPlanContextFromAnalysis`; `fileGeneratorService` / `getProjectContextForHighLevelFiles` use analysis; enhanced-chat uses `buildPlanContextFromAnalysis` and analysis in `buildSystemPrompt`.

3. **Full project plan** — Overview automation generates full plan via POST plan, then sync-state. Enforced: `[id]/page.tsx` setupStep `plan` → POST plan, POST plan/sync-state.

4. **Full project build** — After file generation, run-build is called. Enforced: `[id]/page.tsx` setupStep `build` → POST run-build.

5. **All file and code completion run autonomously in the in-flight modal** — The modal runs preparing → analysis → plan → files → build → done without user steps. File generation is one autonomous run over every file in the plan. Enforced: `[id]/page.tsx` single useEffect that runs the sequence; `files/generate` iterates over `filesToGenerate` (stream or non-stream).

6. **Concrete rule: GRIP runs until all file creations have full code for ALL files** — File generation does not stop until every file in the plan has been processed; each must have full runnable code or a reported failure. No skipping; no partial success. Enforced: `files/generate` route loops over every file; `fileGeneratorService.generateFile` uses `isPlaceholderOrEmpty` and rejects empty/placeholder; response/stream includes `mandatoryRuleMessage` when any file fails; `grip-all-code-for-all-files.mdc` and `full-grip-build.mdc` state this explicitly.

---

## Gaps (all fixed as of alignment run)

### 1. Legal-sandbox chat prompt (sandbox-parity) — FIXED

**Rule:** sandbox-parity.mdc — same rules for main and sandbox.

**Fix:** Legal-sandbox chat now injects: MANDATORY_GRIP_APP_VS_USER_SETTINGS, MANDATORY_GRIP_BUILD_QUALITY, MANDATORY_GRIP_ALL_CODE_FOR_ALL_FILES, MANDATORY_GRIP_ENV_AND_PRODUCTION_SETUP; repo type rules (getMandatoryRepoTypeRules); user uploads "You MUST use them" + userUploadsSummary; "Likely remaining to implement" when available; phase-completion revert-and-rerun block. Handler loads uploads from legalSandboxFiles, detects repo type from sandboxAnalyses/sandboxFilePaths, and builds likelyRemaining from route_map/missing_capabilities.

**File:** `src/app/api/projects/[id]/legal-sandbox/chat/route.ts`

### 2. Other chat routes and anthropicService (grip-identity-and-env) — FIXED

**Rule:** grip-identity-and-env.mdc — "Other chat routes ... must preserve GRIP identity and prefer anthropicService."

**Fix:** `src/app/api/chat/route.ts` and `src/app/api/ai/chat/route.ts` now call `anthropicService.initialize(apiKey)` and `anthropicService.createMessage(...)`.

---

## Before ensuring alignment (green run)

1. **Run tests** — `npm test` (or project test command) so nothing is broken before edits.
2. **Run lint** — `npm run lint`.
3. **Use this checklist** — For each rule, confirm the listed code locations still exist and match the rule; fix any drift.
4. **Constants vs rules** — When changing `buildQualityPlan.ts` or prompt injection, keep `.cursor/rules/` and this doc in sync (see top comment in `buildQualityPlan.ts`).

**Production readiness:** For the build to stay on track, reference only `.cursor/rules/*.mdc` and this doc. Other docs are in `docs/archive/`. See `docs/README.md`.

---

## Production testing readiness

Use this checklist to get ready for testing in production (and to keep GRIP app env separate from user project settings).

### 1. GRIP app env (never mix with user project Settings)

- **Local:** Copy `.env.example` to `.env.local` and set real values for the GRIP app only:
  - `MONGODB_URI` — GRIP app database (users, projects, chat state).
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, OAuth IDs if using auth.
  - `ANTHROPIC_API_KEY` — for GRIP AI chat.
- **Vercel (production):** In Project → Settings → Environment Variables, set the same GRIP app vars. Do **not** put user project MongoDB or user build secrets here; those live in Dashboard → Settings (user’s project).

### 2. CI (optional but recommended)

- The existing workflow (`.github/workflows/build.yml`) runs lint + build with dummy env. To run tests in CI:
  - Add a step: `run: npm test` (no `MONGODB_URI` needed; 7 suites run, 6 skip).
  - Optionally add a second job that sets `MONGODB_URI` (as a secret) to run the 6 MongoDB-dependent suites against a test DB.

### 3. After deploy (smoke test)

- `GET /api/health` — should return 200 and `database: 'connected'` when GRIP app DB is reachable.
- `GET /api/health/anthropic` — should return 200 when `ANTHROPIC_API_KEY` is set and valid.
- Use these in Vercel health checks or a simple post-deploy script.

### 4. Separation rule (concrete)

- **GRIP app:** `.env` / Vercel env only (e.g. `MONGODB_URI`, `ANTHROPIC_API_KEY`).
- **User’s project:** Dashboard → Settings (Backend connections, etc.). GRIP never uses those for its own backend; tests never use user MongoDB.

---

## References

- All rule files: `.cursor/rules/*.mdc`
- Constants: `src/lib/constants/buildQualityPlan.ts` (comment lists rules)
- Parity: `docs/GRIP_SANDBOX_PARITY.md`
- Full build: `docs/FULL-BUILD-REQUIREMENTS.md`
