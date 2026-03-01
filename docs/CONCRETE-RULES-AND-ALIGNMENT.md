# Concrete Rules and Codebase Alignment

This doc lists all Cursor rules in `.cursor/rules/` and where GRIP's code enforces them. Use it to verify alignment before/after changes.

---

## Mandatory process rule (source of truth and changes)

**We work only from this file and `.cursorrules`.** All GRIP behavior, rules, and alignment are defined and tracked here and in `.cursorrules`. No other doc or rule set overrides these two.

**Before updating either file:** Every change to `docs/CONCRETE-RULES-AND-ALIGNMENT.md` or `.cursorrules` must be **verified and confirmed** (e.g. proposed, then approved) so we stay on track and on the same page. Do not edit these two files without that confirmation.

---

## Rule index (23 rules, all `alwaysApply: true`)

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
| 16 | npm-build-environment-errors.mdc | Handle ERESOLVE, EBADENGINE, ESM/CommonJS so npm install and dev/build succeed |
| 17 | one-stack-only.mdc | One stack per project; never mix Next.js (web) with Expo/React Native (mobile); prevents ERESOLVE and StackBlitz stack collision |
| 18 | expo-only-for-expo-apps.mdc | Never add expo/react-native/@expo/* to package.json for web (Next.js/Vite/CRA) projects; only for 100% Expo/React Native apps—prevents corrupted installs and StackBlitz |
| 19 | nextjs-app-router-layout.mdc | Next.js App Router root layout: children in signature, Metadata API not next/head, return only html/body/children (prevents "children is not defined") |
| 20 | preview-ready-navigation-and-styling.mdc | All buttons/links must work and route correctly; web apps must be styled for clean, modern first-visit in GRIP Preview/StackBlitz (no dead links, no plain/unstyled UI) |
| 21 | stackblitz-main-page-on-first-visit.mdc | **GRIP must enforce in generated code** that the user is always routed to the main page when previewing (StackBlitz/GRIP Preview); root `/` is the main page; no redirects away from it on first load |
| 22 | first-build-complete-deployable | **First automation build = 100% deployable product:** full styling, full functionality, no mock data; in-flight modal does not exit until build succeeds and the product is deployable |
| 23 | mobile-first-builds-and-preview | **Mobile-first (iOS/Android/Expo):** Native iOS/Android: no StackBlitz; run-build returns success without npm; preflight rejects stackblitz with clear message; Preview tab shows Export + Xcode/Android Studio. Expo: StackBlitz for web target; same flow as web. |

---

## Where each rule is enforced (code locations)

| Rule | Primary code locations |
|------|-------------------------|
| grip-all-code-for-all-files | Full code for every file; Overview automation does not stop until every file has full code or reported failure. `buildQualityPlan.ts` MANDATORY_GRIP_ALL_CODE_FOR_ALL_FILES; `planGeneratorService`; `fileGeneratorService` isPlaceholderOrEmpty; `files/generate` loop over all files, mandatoryRuleMessage. **Template choice:** config/schema/lib/hooks/types (and similar) use `full-file` template (`projectPlanningService.defaultTemplateForPath`); `templateEngineService` full-file prompt returns single FileContent with full code. |
| full-grip-build | **Mandatory flow before enhanced chat:** project creation → analyze (all pipeline steps); analysis results → Anthropic (plan + file gen); Overview in-flight modal runs plan → files/generate (every file, full code) → build autonomously; **sequential stages—no advance to next stage until current stage returns success**; GRIP runs until all file creations have full code (concrete rule). Code: `src/app/api/projects/route.ts` (create + analyzeProject); `analysisService` (repo clone, ideation→prompt, tree-sitter); `planGeneratorService` + `fileGeneratorService` read analyses; `src/app/dashboard/projects/[id]/page.tsx` setupStep + strict per-stage success checks (analysis 200 + status done, plan 200, sync-state 200, files/generate 200 + stream done, run-build 200); `files/generate` loop over all files, mandatoryRuleMessage on failure. **Observability:** `[GRIP Stage N]` logging in analysis/refresh, plan, plan/sync-state, files/generate, run-build and in fileGeneratorService for placeholder/empty rejections. Export/deploy/preview/repo; `FULL-BUILD-REQUIREMENTS.md`. |
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
| npm-build-environment-errors | **ERESOLVE:** runMainProject and runSandboxProject retry `npm install --legacy-peer-deps` when first install fails with ERESOLVE. **EBADENGINE:** package.json generation should set `engines.node` for stack (Expo/Metro → >=20.19.4; Next → >=18.17). **ESM/CommonJS:** when package.json has `"type": "module"`, next.config and other .js configs must use ESM (import/export), not require/module.exports. buildQualityPlan MANDATORY_GRIP_NPM_BUILD_ENVIRONMENT; injected in planGeneratorService and enhanced-chat; .cursor/rules/npm-build-environment-errors.mdc. |
| one-stack-only | **One stack only:** Never mix Next.js with Expo/React Native in the same project. buildQualityPlan MANDATORY_GRIP_ONE_STACK_ONLY; injected in planGeneratorService, enhanced-chat, and legal-sandbox chat. Plan prompt includes "CRITICAL — One stack only" and files/package.json must match one stack. exportService normalizePackageJsonForExport infers stack and stripOtherStackDeps() removes the other stack's deps so export/StackBlitz get single-stack package.json. .cursor/rules/one-stack-only.mdc. |
| expo-only-for-expo-apps | **Expo only for 100% Expo apps:** Never add expo, react-native, or @expo/* to package.json for web (Next.js, Vite, CRA) projects; only when the project is explicitly a 100% Expo/React Native app. Adding "expo": "*" to web corrupts npm install and StackBlitz. buildQualityPlan MANDATORY_GRIP_EXPO_ONLY_FOR_EXPO_APPS; injected in planGeneratorService, enhanced-chat, and legal-sandbox chat; templateEngineService full-file prompt includes CRITICAL block when generating package.json. packageJsonRequirementsService inferStackFromDepsAndPaths prefers path-based inference (next.config, app/, vite.config) so stray expo in deps does not override web stack; exportService stripOtherStackDeps removes expo/react-native/@expo/* for web stacks. .cursor/rules/expo-only-for-expo-apps.mdc. |
| nextjs-app-router-layout | **Next.js App Router root layout:** app/layout.tsx must define `children` in the function signature (`RootLayout({ children }: { children: React.ReactNode })`), use Metadata API not next/head, and return only `<html><body>{children}</body></html>`. buildQualityPlan MANDATORY_GRIP_NEXTJS_APP_ROUTER_LAYOUT; injected in planGeneratorService, enhanced-chat, and legal-sandbox chat; templateEngineService full-file prompt includes CRITICAL block when generating app/layout.tsx or src/app/layout.tsx. .cursor/rules/nextjs-app-router-layout.mdc. |
| preview-ready-navigation-and-styling | **Navigation:** All buttons and links must work and route to the correct page; no dead links or placeholder onClick. **Styling:** Web apps must be styled (Tailwind/cohesive design) for a clean, modern first-visit in GRIP Preview/StackBlitz—not plain or unstyled. buildQualityPlan MANDATORY_GRIP_NAVIGATION_AND_INTERACTIVITY and MANDATORY_GRIP_STYLING_AND_FIRST_VISIT_UX; injected in planGeneratorService, enhanced-chat, and legal-sandbox chat. .cursor/rules/preview-ready-navigation-and-styling.mdc. |
| stackblitz-main-page-on-first-visit | **Route to main page (enforce in generated code):** GRIP must generate code so the user is always routed to the main page when opening the app in StackBlitz or GRIP Preview. Root `/` is the main page; do not generate middleware or redirects that send first-time visitors away from `/`. buildQualityPlan MANDATORY_GRIP_STACKBLITZ_MAIN_PAGE_ON_FIRST_VISIT; injected in planGeneratorService, enhanced-chat, and legal-sandbox chat; templateEngineService full-file prompt includes CRITICAL block when generating app/page.tsx or src/app/page.tsx (main landing page). stackblitzOpen.inferOpenFile prefers app/page.tsx for Next.js so editor opens main page. .cursor/rules/stackblitz-main-page-on-first-visit.mdc. |
| first-build-complete-deployable | **First build = 100% deployable (styling + full functionality + no mock data):** buildQualityPlan MANDATORY_GRIP_FIRST_BUILD_COMPLETE_DEPLOYABLE; injected in planGeneratorService, enhanced-chat, and legal-sandbox chat. **Template engine (Stage 4):** For every web UI file (app/*, components/*, globals.css), templateEngineService injects this mandate + styling into the full-file prompt and the generic variable prompt so generated code is styled and deployable. In-flight modal: done only when run-build returns success (dashboard/projects/[id]/page.tsx). |
| mobile-first-builds-and-preview | **Expo:** Inferred from package.json (inferStackFromDepsAndPaths); run-build uses npm + Expo scripts; preflight allows StackBlitz when Expo has web deps; Preview shows "Run in StackBlitz (Expo web)". **Native iOS/Android:** repoTypeDetection category ios_swift / android_kotlin from identity.project_type or paths. run-build: when category is ios_swift or android_kotlin, return success without running npm (no Xcode/Gradle on server). preflight: for target=stackblitz, when native mobile, return ok: false with message to use Export + Xcode/Android Studio. Preview tab: when repoCategory is ios_swift or android_kotlin, hide or disable "Run in StackBlitz"; emphasize Export to GitHub and "Open in Xcode/Android Studio". GET /api/projects/[id] adds repoCategory from analysis. Code: `run-build/route.ts`, `preflight/route.ts`, `repoTypeDetection.getNativeMobileRepoCategory`, `projects/[id]/route.ts` (repoCategory), `preview/page.tsx` (isNativeMobile). |

---

## Styling and first-build enforcement in the middle (deep analysis)

**Where styling is enforced**

| Stage | Location | How |
|-------|----------|-----|
| **Plan (Stage 3)** | `planGeneratorService.ts` | Injects MANDATORY_GRIP_STYLING_AND_FIRST_VISIT_UX, MANDATORY_GRIP_FIRST_BUILD_COMPLETE_DEPLOYABLE, MANDATORY_GRIP_BUILD_QUALITY (no mock data, deployable readiness). Plan prompt includes these so the file list and phase/task descriptions align with styled, deployable output. |
| **Plan context (analysis → repo context)** | `planContextFromAnalysisService.ts` | When building stack guidance for website/webApp layers, injects styling reference repos (shadcn-ui/ui, tailwindlabs/headlessui) and “Shadcn-style components, Headless UI, Tailwind, accessibility.” Used when building repo context document for chat; plan API uses analysis and phases. |
| **File generation (Stage 4)** | `templateEngineService.ts` | **full-file template:** For every path that is a web UI file (app/*.tsx|jsx, components/*, globals.css, layout/page files), injects MANDATORY_GRIP_FIRST_BUILD_COMPLETE_DEPLOYABLE and a short styling mandate into the AI prompt so the generated file content is styled and production-ready. **nextjs-page / react-component (generic prompt):** Same: when path is web UI, adds “First build must be 100% deployable with full styling and no mock data” so variable values produce styled, complete UI. Helper: `isWebUIFilePath()`. |
| **Chat (Develop)** | `enhanced-chat/route.ts`, `legal-sandbox/chat/route.ts` | Injects MANDATORY_GRIP_STYLING_AND_FIRST_VISIT_UX, MANDATORY_GRIP_FIRST_BUILD_COMPLETE_DEPLOYABLE, STYLING_REQUIREMENTS_FOR_GRIP (shadcn/Headless UI text). Any code GRIP writes in chat follows the same styling and first-build-complete rules. |
| **In-flight modal gate** | `dashboard/projects/[id]/page.tsx` | Modal does not show “done” until POST run-build returns 200 and response body has `success: true`. No separate “deployability” check; deployability is enforced by the prompts above so the first build is complete, styled, and without mock data. |

**Summary:** Styling and “first build = 100% deployable” are enforced in (1) plan prompt, (2) plan context stack guidance, (3) **file generation prompts** (full-file and generic) for every web UI file, and (4) enhanced and legal-sandbox chat. The in-flight modal exits only on successful build.

---

## Full automation concrete requirements (full-grip-build)

These are the concrete requirements for the mandatory flow; code must align so users do not waste tokens on false or partial results.

1. **Project creation and analysis using all pipeline steps ("all middles")** — On create (with repo) or when opening Overview with linked repo but no analysis, GRIP runs full analysis: repo clone, ideation-based technical prompt, tree-sitter/structured analysis. Enforced: `analysisService.analyzeProject` (getOrCloneRepository, buildTechnicalAnalysisPromptFromIdeation, analyzeRepositoryStructureWithTreeSitter); project create calls it; Overview calls POST `analysis/refresh` when `!hasAnalysis` then polls status.

2. **Analysis results sent to Anthropic API calls** — Stored analysis (repositoryAnalysis, structuredAnalysis) is input to plan generation and file generation. Enforced: `planGeneratorService` reads `analyses` and uses `buildPlanContextFromAnalysis`; `fileGeneratorService` / `getProjectContextForHighLevelFiles` use analysis; enhanced-chat uses `buildPlanContextFromAnalysis` and analysis in `buildSystemPrompt`.

3. **Full project plan** — Overview automation generates full plan via POST plan, then sync-state. Enforced: `[id]/page.tsx` setupStep `plan` → POST plan, POST plan/sync-state.

4. **Full project build** — After file generation, run-build is called. Enforced: `[id]/page.tsx` setupStep `build` → POST run-build.

5. **All file and code completion run autonomously in the in-flight modal** — The modal runs preparing → analysis → plan → files → build → done without user steps. File generation is one autonomous run over every file in the plan. Enforced: `[id]/page.tsx` single useEffect that runs the sequence; `files/generate` iterates over `filesToGenerate` (stream or non-stream).

6. **Concrete rule: GRIP runs until all file creations have full code for ALL files** — File generation does not stop until every file in the plan has been processed; each must have full runnable code or a reported failure. No skipping; no partial success. Enforced: `files/generate` route loops over every file; `fileGeneratorService.generateFile` uses `isPlaceholderOrEmpty` and rejects empty/placeholder; response/stream includes `mandatoryRuleMessage` when any file fails; `grip-all-code-for-all-files.mdc` and `full-grip-build.mdc` state this explicitly. **Template choice (full code):** Paths that need complete file content (config files including vercel.json, schema, lib/*, hooks/*, types, middleware, public/manifest.json, public/sw.js, docs/*.md, docs/*.mdx) use the **full-file** template so the AI returns one `FileContent` variable with full runnable code; **ts-utility** is used only when the template’s `functions` array can be populated. Enforced: `projectPlanningService.defaultTemplateForPath` maps those paths to `full-file`; `templateEngineService.generateTemplateVariables` uses a dedicated full-file prompt (higher max_tokens, FileContent only) for that template. **Public image/binary assets** (public/** with .png, .ico, .jpg, .jpeg, .gif, .webp) use **static-asset**: no AI; minimal placeholder binary stored as base64; export, run-build, download, and sandbox run decode base64 when writing. Enforced: `defaultTemplateForPath` maps those to `static-asset`; `fileGeneratorService.generateStaticAssetFile`; `isBinaryAssetPath` in runMainProject, runSandboxProject, export, download.

7. **Sequential stages: no advance until success** — The Overview in-flight modal must open **immediately** when the run is triggered (on "Rerun plan and build" click or when the auto-run effect runs), before any API call, so the user sees that GRIP is working and does not leave the app. It must not advance from one stage to the next until the current stage’s API returns success. Stage 1 (preparing): delay only. Stage 2 (analysis): advance only when POST `analysis/refresh` returns 200 and `analysis/status` reports completion within 90s. Stage 3 (plan): advance only when POST plan and POST plan/sync-state both return 200. Stage 4 (files): advance only when POST `files/generate` returns 200 and the NDJSON stream sends a `done` event. Stage 5 (build): advance to **done** only when POST run-build returns 200 **and** the response body has `success: true` (build actually succeeded). If run-build returns 200 but `success: false`, clear the modal and show an error toast; do not show done. On any other failure, the modal is cleared and automation stops. Enforced: `src/app/dashboard/projects/[id]/page.tsx` sets `setSetupStep('preparing')` at the very start of run() and on "Rerun plan and build" button click; after run-build it checks `buildData.success` and only calls `setSetupStep('done')` when true, otherwise `setSetupStep(null)` and sonnerToast.error for build failure.

8. **Build automation observability (Vercel logs + GRIP log file)** — All build-automation API routes log with prefix `[GRIP Stage N]` (N = 2 analysis, 3 plan/sync, 4 files, 5 run-build) so Vercel logs can be filtered to find where a stage failed. The same events are written to **logs/grip.log** via `gripLogger` (src/lib/gripLogger.ts); use **tail -f logs/grip.log** in a terminal to track GRIP runs without mixing with other server output. Enforced: `analysis/refresh`, `plan`, `plan/sync-state`, `files/generate`, `run-build` use console.info/warn/error with that prefix and call `gripLog(stage, event, data)`; `fileGeneratorService` logs `[GRIP Stage 4] file rejected as placeholder/empty` and `gripLog(4, 'file rejected as placeholder/empty', ...)`. Do not remove or weaken these logs; they are required for diagnosing full-file-creation failures.

9. **Admin token reset and area of assurance** — GRIP must provide a dedicated area of assurance where admin can reset tokens to zero (for self and for other users) and respond quickly to token/access errors for real users. Admin must be able to reset `tokensUsedThisPeriod` to 0 for their own account and for any user (by userId or email) without changing allowances. The Token limits admin page must include a “Quick response: token reset (area of assurance)” section with: (1) “Reset my tokens to zero” (admin self), (2) “Reset tokens for another user” by email or user ID. **Reconcile token usage:** Admin must be able to set a user's recorded usage (by "remaining" or "tokensUsedThisPeriod") so GRIP tracking matches actual usage (e.g. Claude console). Enforced: `POST /api/admin/reset-tokens`; `POST /api/admin/reconcile-tokens` (body `{ userId|email, remaining?|tokensUsedThisPeriod? }`); `src/app/dashboard/admin/token-limits/page.tsx` with area-of-assurance card and Reconcile token usage card. Do not remove these APIs or the UI; they are required for rapid response and accurate tracking for real users.

10. **npm and build environment errors** — GRIP must prevent or recover from ERESOLVE (peer dependency conflicts), EBADENGINE (Node version), and ESM/CommonJS ("require is not defined") so `npm install` and `npm run dev` (or `build`) succeed. **(1) ERESOLVE:** runMainProject and runSandboxProject retry `npm install --legacy-peer-deps` when the first install fails with ERESOLVE; plan and chat prefer compatible dependency versions in package.json. **(2) EBADENGINE:** package.json must set `"engines": { "node": ">=X.Y.Z" }` per stack (Expo/Metro 0.83 → >=20.19.4; Next → >=18.17). Enforced: package-json template includes `engines.node`; `fileGeneratorService` sets NodeEngineVersion to >=20.19.4 when framework is expo. **(3) ESM/CommonJS:** GRIP-generated package.json uses "type": "module", so next.config.js must always be ESM (const nextConfig = { ... }; export default nextConfig; never module.exports). Enforced: `templateEngineService` full-file prompt for next.config.js requires ESM and warns against module.exports; `buildQualityPlan.ts` MANDATORY_GRIP_NPM_BUILD_ENVIRONMENT; `.cursor/rules/npm-build-environment-errors.mdc`; `.cursorrules` npm_build_environment_errors.

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
5. **Overview automation / file generation** — When changing `[id]/page.tsx` run(), analysis/refresh, plan, plan/sync-state, files/generate, or run-build: verify sequential stages (no advance until success) and `[GRIP Stage N]` logging are preserved; see requirements 7 and 8 above and `.cursorrules` overview_in_flight_stages and build_automation_logging.
6. **Admin token reset / area of assurance** — When changing admin token or access flows: preserve the area-of-assurance UI on the Token limits page and the `POST /api/admin/reset-tokens` API so admin can reset tokens for self or other users; see requirement 9 and `.cursorrules` admin_token_reset_and_assurance.

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

## Mobile-first builds and preview (concrete)

**Expo (React Native):** Inferred from package.json; run-build uses npm + Expo scripts. Preview: StackBlitz runs Expo web (`expo start --web`). Preflight allows stackblitz when Expo has web deps. One stack only; Expo only for 100% Expo apps (rules 17, 18).

**Native iOS (Swift/SwiftUI):** Repo type `ios_swift` (repoTypeDetection). Run-build returns success without running npm; preflight for target=stackblitz returns ok: false with message to use Export + Xcode. Preview tab: when repoCategory is ios_swift, show native-iOS card (Export / Download, open in Xcode); do not offer Run in StackBlitz.

**Native Android (Kotlin):** Repo type `android_kotlin`. Same as iOS: run-build returns success without npm; preflight rejects stackblitz; Preview tab shows Export + "Open in Android Studio" when repoCategory is android_kotlin.

**Enforcement:** `getNativeMobileRepoCategory` (repoTypeDetection); run-build and preflight read repositoryAnalysis.structuredAnalysis.identity; GET /api/projects/[id] adds repoCategory; preview page uses isNativeMobile to switch UI. Detailed strategy and tables: `docs/archive/MOBILE-FIRST-BUILDS-AND-PREVIEW.md`.

---

## Pricing and Stripe (business-first, concrete)

**Revenue model:** GRIP first; admin share on an ongoing basis. **75% GRIP** (tokens, infra, margin, runway); **25% admin** (operator take). Token cost at 100% use is kept **≤ 50% of revenue** so GRIP has non-token margin. Source: `src/lib/stripe.ts` — `REVENUE_TO_GRIP_PCT`, `REVENUE_TO_ADMIN_PCT`, `MAX_TOKEN_COST_PCT`.

**Tiers (business-ready at ~$6.97/1M):** Starter 1.3M / Pro 3.5M / Team 7M tokens per month at $19 / $49 / $99. Stripe Price IDs: `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_TEAM`. Webhook and plan/access use `TIERS` from stripe.ts for tokensPerMonth.

**Token add-ons (one-time):** 500K and 1M packs. Env: `STRIPE_PRICE_ID_ADD_TOKENS_500K`, `STRIPE_PRICE_ID_ADD_TOKENS_1M`. Checkout metadata `type: 'add_tokens'`, `tokens: string`; webhook adds to `user.tokenAllowance`. Price add-ons so token cost ≤ 50% of sale (e.g. 500K ≈ $6.99, 1M ≈ $13.99 at $6.97/1M). Detailed tables and Stripe setup: `docs/archive/PRICING-AND-STRIPE-ADDONS.md`.

---

## References

- All rule files: `.cursor/rules/*.mdc`
- Constants: `src/lib/constants/buildQualityPlan.ts` (comment lists rules)
- Tiers and revenue: `src/lib/stripe.ts` (TIERS, REVENUE_TO_GRIP_PCT, REVENUE_TO_ADMIN_PCT, MAX_TOKEN_COST_PCT, TOKEN_ADD_ONS)
- Parity: `docs/GRIP_SANDBOX_PARITY.md`
- Full build: `docs/FULL-BUILD-REQUIREMENTS.md`
- Archived detail: `docs/archive/` (e.g. MOBILE-FIRST-BUILDS-AND-PREVIEW.md, PRICING-AND-STRIPE-ADDONS.md)
