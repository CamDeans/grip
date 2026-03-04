/**
 * Mandatory GRIP build-quality plan.
 * Injected into plan generation and enhanced chat so every build follows the same bar:
 * latest stable libraries, modern UX/UI, clean design, best practices.
 * Reduces token waste by getting the first build right.
 *
 * Concrete Cursor rules (must stay in sync): .cursor/rules/
 * - grip-all-code-for-all-files.mdc, stackblitz-mandatory-files.mdc, grip-identity-and-env.mdc
 * - full-grip-build.mdc, repo-types-mandate.mdc, clean-room-code-generation.mdc, code-and-file-reuse.mdc
 * - user-uploads-must-use.mdc, no-mock-data-production-ready.mdc, project-specific-scaffolding.mdc
 * - repo-separation.mdc, sandbox-parity.mdc, likely-remaining-preference.mdc, phase-completion-revert.mdc
 * - build-artifacts-align-with-code.mdc
 * - npm-build-environment-errors.mdc
 */

/** MANDATORY: GRIP uses only env; Settings vars are for the user's app build only. */
export const MANDATORY_GRIP_APP_VS_USER_SETTINGS = `
## MANDATORY: GRIP app vs user settings (never mix)

- **GRIP app** uses **only** environment variables: .env / .env.local in dev, Vercel (or deployment) vars in production. GRIP must **never** read Dashboard → Settings for its own backend (e.g. AI, plan, build execution). ANTHROPIC_API_KEY and any GRIP backend config come from deployment env only.
- **User Settings vars** = what users enter in Dashboard → Settings (Backend connections, System Integration, etc.). GRIP uses these **only** to inject into the **user's project** when building their app: GRIP adds them to the project-specific .env file for the user's build. Settings vars are for the user's app, not for GRIP's own functionality.
- **Rule:** GRIP code must never read Settings for GRIP's AI or backend. Errors for GRIP AI/deployment must direct users to set vars in deployment (e.g. Vercel env vars or .env.local). When the **user's project** needs a var (e.g. MONGODB_URI), point them to Dashboard → Settings → Backend connections so they can copy into their project .env.
`.trim()

/**
 * Mandatory GRIP concept: repo piggyback and ideation alignment.
 * GRIP analyzes the GitHub repo and produces a build that achieves maximum closeness to the repo (structure, behavior, routes, UX) without copying code—piggybacking on the original creator's work. User ideation is the spec; repo is the blueprint. Align both so the user gets exactly what they asked for.
 */
export const MANDATORY_GRIP_REPO_PIGGYBACK = `
## MANDATORY: Repo piggyback and ideation alignment (concrete rule)

- **GRIP = analyze repo, duplicate closeness without copying.** The whole concept of GRIP is to take GitHub repos, analyze them, and produce a build that is as close a match to the repo as possible **without copying code or content** from the repo—achieving closeness by piggybacking off the work already done by the original creator/developer. This is mandatory and concrete.
- **User ideation is the spec; repo is the blueprint.** (1) Compare repo analysis to user ideation step by step. (2) What the repo has that matches ideation → implement in new, clean-room code (same structure, routes, behavior, UX). (3) What the user wants that the repo does not have → also implement in new code so the user gets exactly what they asked for. Align repo and ideation together; do not drop or dilute either.
- **No partial files; complete code only.** Every file must contain full, production-ready code that aligns with both repo-derived scope and user ideation. No placeholders, no "add later," no stub-only content. Claude has no restraint to writing complete files—deliver full implementations so the first build matches the user's expected outcome.
- **Middles (tree-sitter, plan context, styling) serve this rule.** Tree-sitter analysis must compare repo to ideation and output matched_capabilities (repo fulfills ideation) and missing_capabilities (ideation asks for it; we build it). Plan and file generation must use that alignment so the build achieves full potential: repo closeness + 100% ideation fulfillment.
`.trim()

/**
 * Mandatory GRIP rule: use 100% of analysis context (tree-sitter + repo) alongside user ideation.
 * No dropping or truncating of context; analysis and ideation together are the single source of truth.
 */
export const MANDATORY_GRIP_FULL_ANALYSIS_CONTEXT = `
## MANDATORY: Use 100% of analysis context alongside user ideation (concrete rule)

- **GRIP must use 100% of the analysis context.** All tree-sitter and repository analysis (routes, entrypoints, symbol_index, import_graph, behavior_flows, user stories, acceptance criteria, matched/missing capabilities, subsystems, boot sequence, dependency summary) must be passed into the plan and file generation. Do not drop, truncate, or ignore any part of the analysis when it is available.
- **The implementation checklist and structured summary must include every route, entrypoint, behavior flow, user story, and acceptance criterion from the analysis—no partial lists when the full list fits within tier limits.** Plan phases and the "files" array must reflect each of these; implement each in new code; do not copy repo source.
- **Analysis and user ideation work together.** User ideation is the spec; analysis is the blueprint. Both are the single source of truth for what to build.
- **No arbitrary caps on context.** Where analysis is provided (tree-sitter structured analysis, repo reference), include it in full (or up to tier character limits). Do not slice lists to tiny subsets when the full list fits—use the full context so GRIP can fulfill 100% of scope alongside ideation.
- **Outcome:** Every build uses the complete analysis context together with the user's ideation so the delivered app matches both the repo-derived scope and 100% of what the user asked for.
`.trim()

export const MANDATORY_GRIP_BUILD_QUALITY = `
## GRIP mandatory build quality (follow every time)

- **Libraries and stack:** Use latest stable versions of dependencies (check current npm/lockfile). Prefer well-maintained, widely adopted libraries. Avoid deprecated or experimental APIs unless the user explicitly requests them.
- **UX/UI:** Apply modern design practices: clear information architecture, consistent spacing and typography, sensible user flows, visual hierarchy, feedback and affordances (loading states, errors, success). Prefer clean, minimal layouts unless the user asks for a specific style. Ensure responsive behavior where relevant (mobile/desktop).
- **Accessibility:** Follow a11y best practices (semantic HTML, ARIA where needed, keyboard navigation, focus management, sufficient contrast). Aim for WCAG 2.1 AA where feasible.
- **Code quality:** Production-minded code: clear naming, separation of concerns, no dead code. Structure that scales (components, hooks, utils). So the first build is maintainable and the user does not waste tokens on rework.
- **User flow:** Design the first build so core user flows work end-to-end (e.g. sign up → main action → outcome). Avoid placeholder-only screens; implement at least one complete path that matches the project goals.
- **Token efficiency:** Deliver a complete, high-quality first build so the user does not need multiple rounds of "fix this" or "add this." Prefer one well-scoped implementation over many partial ones.
- **Deployable readiness:** When you mark a phase complete or declare the project production ready, the output MUST be fully deployable. Every file and code creation MUST actually change the codebase to align with the current state—no placeholder-only screens, no "add this later" gaps, no mismatched dependencies or broken imports. The user must get a runnable, deployable app when GRIP finishes; do not leave the user to waste tokens going back and forth to get the build up to speed.
- **No mock data; production-ready code only:** For new project creations and automation, do NOT include mock data, fake APIs, or placeholder data in file creations or code generation. All files and code MUST be production ready: use real environment variables, real API contracts, and real data flow. If the app needs an API key or backend URL, use env vars (e.g. \`process.env.API_URL\`) and document them in .env.example; do not hardcode dummy values.
- **Database setup when persistence is indicated (MANDATORY):** If there is **any** mention of content creation, saved data, user-generated content, images, video, uploads, "save", "persist", "store data", "user data", "posts", "comments", "media", or other indicators that the app should save or use stored data, you MUST add **database setup** to the build. Include: (1) \`MONGODB_URI\` (or the appropriate DB connection) in .env.example and wire the app to the database; (2) connection logic and at least one collection/model for the data being saved; (3) instructions pointing the user to **Dashboard → Settings → Backend connections** for MongoDB (or the relevant GRIP setting). Do not assume the app is "static" or "client-only" when the user's goals imply saving or storing data—add the database layer by default.
`.trim()

/**
 * Mandatory GRIP rule: one stack only per project. Never mix Next.js (web) with Expo/React Native (mobile).
 * Prevents npm ERESOLVE and StackBlitz "which stack to run" failures.
 */
export const MANDATORY_GRIP_ONE_STACK_ONLY = `
## MANDATORY: One stack only per project (no stack collision)

- **Choose exactly ONE stack before planning and before writing any code.** Each project has exactly one of: Next.js (web), Expo/React Native (mobile), Vite (web), CRA, or other. Never combine two stacks in the same project.
- **Never mix Next.js with Expo/React Native.** These are different ecosystems (web vs mobile). Mixing them causes: npm ERESOLVE (react vs react-native peer conflicts), StackBlitz not knowing which command to run (next dev vs expo start), and broken installs. If the project is a web app, use only Next.js (or Vite)—do NOT add expo, react-native, or @expo/*. If the project is a mobile app, use only Expo—do NOT add next or next-auth.
- **package.json must list only dependencies for the chosen stack.** For Next.js web: next, react, react-dom, and web-only deps (e.g. next-auth). For Expo mobile: expo, react-native, and mobile deps. Do not list both next and expo in the same package.json.
- **Scripts must match the one chosen stack.** One dev script (e.g. "next dev" OR "expo start --web"), one build script—never scripts for two frameworks. Infer the stack from repo structure and user intent; then commit to that stack for the entire plan and all generated files.
`.trim()

/**
 * Mandatory GRIP rule: expo only for 100% Expo/React Native apps.
 * Adding expo to web (Next.js/Vite) package.json corrupts installs and StackBlitz.
 */
export const MANDATORY_GRIP_EXPO_ONLY_FOR_EXPO_APPS = `
## MANDATORY: Expo only for 100% Expo/React Native apps

- **Never add expo, react-native, or @expo/* to package.json for web projects.** For Next.js, Vite, or CRA web apps, package.json must NOT contain "expo", "react-native", or any "@expo/*" / "@react-native/*" dependency. Adding "expo": "*" (or any expo) to a web project corrupts npm install and StackBlitz (ERESOLVE, wrong scripts, broken preview).
- **Expo only when the project is explicitly a 100% Expo/React Native app.** Only then include expo, react-native, and mobile-only deps. If the repo has app/, next.config, or the plan says "Next.js web app", do NOT add expo to package.json.
- **When generating or editing package.json:** Infer stack from the project (plan, repo structure, app/ directory). For web: list only next, react, react-dom, and web deps. For Expo mobile: list only expo, react-native, and mobile deps. Never list both.
`.trim()

/**
 * Mandatory GRIP rule: only include what is required in package.json and build files.
 * Prevents adding Vite (or any stack) to every project; must stay project-specific.
 */
export const MANDATORY_GRIP_ONLY_REQUIRED_PACKAGE_AND_BUILD = `
## MANDATORY: Only include what is required (package.json and build files)

- **Only required:** In create-project, plan, and build steps, package.json and build/config files (tsconfig, vite.config, next.config, etc.) MUST contain **only** what **this project** actually needs. Include only dependencies the code uses, only scripts for the **project's chosen stack**, and only config files for that stack.
- **Stay project-specific — do NOT default to Vite:** Do NOT add Vite (or vite.config, or Vite scripts) unless this project's repo, plan, or ideation **explicitly** uses Vite. Do NOT add Vite to Next.js projects, CRA projects, or "generic" projects. Infer the stack from: (1) linked repo structure (e.g. app/, next.config → Next; vite.config, index.html + src/main → Vite), (2) plan and ideation (e.g. "Next.js app", "Vite + React"), (3) any "Detected repo type" or stack guidance from the system. Use **that** stack only. Never assume every project is Vite.
- **One stack per project:** Each project has one build tool (Next, Vite, CRA, Expo, etc.). Do not mix (e.g. Next.js app with Vite scripts; Next.js with Expo). If the repo or plan says Next.js, use Next.js scripts and next.config only; do not add Vite or Expo. See MANDATORY_GRIP_ONE_STACK_ONLY.
`.trim()

/**
 * Mandatory GRIP rules for project-specific scaffolding.
 * Each project type (JS/TS web, Python, Go, Rust, iOS, Android, etc.) uses different manifest files and commands—apply the same principles for that stack.
 */
export const MANDATORY_GRIP_PROJECT_SPECIFIC_SCAFFOLDING = `
## MANDATORY: Project-specific scaffolding (plan and build)

**Each project is different.** Infer the project type from the linked repo (structure, frameworks, languages), ideation, and plan. The system may provide "Detected repo type" and stack guidance—use it. Apply the rules below **for this project's stack**. The principles (project-specific config, runnable, no generic placeholders) apply to all projects; the **manifest files and commands** depend on the stack. **Do NOT default to Vite** when the stack is unclear—infer from repo (e.g. app/, next.config) and plan first.

**For JS/TS web projects (Node/npm):**
- **package.json MUST be project-specific and runnable:** Never output empty \`dependencies\` or \`devDependencies\` (e.g. \`"dependencies": {}, "devDependencies": {}\`). Every generated project MUST list every package the codebase actually uses (from every \`import\` / \`require\`). Scripts MUST match the **actual framework** of the codebase: if the app uses Next.js (App Router, next/head, API routes under app/api), use \`"dev": "next dev"\`, \`"build": "next build"\`, \`"start": "next start"\`—never Vite scripts. If the app uses Vite, use \`"dev": "vite"\`, \`"build": "tsc && vite build"\` (or \`vite build\`), \`"preview"\` or \`"start": "vite preview"\`. Wrong scripts cause "command not found". Infer framework from file structure. **Do not add Vite to a project that uses Next.js or another stack.**
- **Vite only when the project uses Vite:** Add Vite (vite.config.*, vite in devDependencies, Vite scripts) ONLY when this project explicitly uses Vite (e.g. plan says "Vite", repo has vite.config, or generated entry is index.html + src/main.tsx). If you generate or use Vite for that project, package.json MUST include \`"vite"\` in \`devDependencies\` and for React also \`@vitejs/plugin-react\`. Never output Vite scripts without the \`vite\` package. **Do not add Vite to every project.**
- **tsconfig.json MUST be project-specific:** \`include\` must cover actual source paths; \`compilerOptions\` must suit the stack (e.g. \`"jsx": "preserve"\` for Next.js, \`"jsx": "react-jsx"\` for Vite). Never output a generic tsconfig that does not align with the generated files.

**For other stacks (Python, Go, Rust, iOS, Android, etc.):** Apply the same principles using that stack's manifest and run commands: Python → requirements.txt or pyproject.toml and pip/poetry install + run command; Go → go.mod and go build/go run; Rust → Cargo.toml and cargo run; iOS → Xcode project and Package.swift; Android → build.gradle and Gradle. Never empty or wrong-command manifests. The user must be able to install and run with the **appropriate** commands for that stack.

**For every project (all stacks):**
- **README.md MUST be project-specific:** Describe **this project** by name and purpose. Include: (1) project name and short description, (2) getting started using **this project's** install/run commands (npm/pip/go/cargo/etc.), (3) main features or usage relevant to this app, (4) tech stack used. NEVER a copy of .env.example, generic "GRIP" text, or a template with no project-specific content.
- **Env/config MUST be project-specific:** List only variables **this app** actually uses (e.g. NextAuth → NEXTAUTH_SECRET, NEXTAUTH_URL; Prisma → DATABASE_URL; Python → API_KEY, DATABASE_URL). Do not paste GRIP Dashboard variables unless the generated app needs them. Document each variable briefly. For non-Node projects, use that stack's config (e.g. .env, config.yaml, environment in README).
`.trim()

/**
 * Mandatory GRIP rule: Next.js App Router — Metadata API only, no next/head.
 * Use in file-type hints for any app/ or src/app/ file so generated code never imports next/head.
 */
export const MANDATORY_GRIP_NEXTJS_METADATA_NO_HEAD = `
FORBIDDEN in app/ and src/app/: \`import Head from 'next/head'\`, \`<Head>\`, or any use of next/head. The App Router does not support it and Next.js will warn: "You're using next/head inside the app directory, please migrate to the Metadata API."
REQUIRED: Use the Metadata API only. Export \`metadata\` (or \`generateMetadata\`) from the file: \`import type { Metadata } from "next"; export const metadata: Metadata = { title: "...", description: "..." };\` For per-page metadata, export \`metadata\` from that page. Never use <Head> in app directory.
`.trim()

/**
 * Mandatory GRIP rule: Next.js App Router root layout must be valid — no next/head, children must be in signature, correct structure only.
 * Prevents "children is not defined" and "next/head inside app directory" errors.
 */
export const MANDATORY_GRIP_NEXTJS_APP_ROUTER_LAYOUT = `
## MANDATORY: Next.js App Router — root layout (app/layout.tsx or src/app/layout.tsx)

When generating or editing \`app/layout.tsx\` or \`src/app/layout.tsx\`, you MUST follow these rules exactly. Violations cause \`ReferenceError: children is not defined\` and "next/head inside app directory" warnings.

1. **Define \`children\` in the function signature.** The root layout MUST receive \`children\` as a prop. Write:
   \`export default function RootLayout({ children }: { children: React.ReactNode }) { ... }\`
   Do NOT use \`{children}\` in JSX without defining it in the function parameters—that causes "children is not defined".

2. **FORBIDDEN: \`next/head\` and \`<Head>\`.** Do NOT use \`import Head from 'next/head'\` or \`<Head>\` anywhere in app/ or src/app/. The App Router does not allow it; Next.js will show: "You're using next/head inside the app directory, please migrate to the Metadata API." Use the **Metadata API only**: at the top of the file, \`import type { Metadata } from "next"\` and \`export const metadata: Metadata = { title: '...', description: '...' }\`. Never use next/head in the app directory.

3. **Return only \`<html>\` and \`<body>\`; do not wrap in fragment or \`<main>\`.** The root layout must return exactly:
   \`return (\\n  <html lang="en">\\n    <body>{children}</body>\\n  </html>\\n)\`
   Do NOT return \`<><Head /> <main><html>...</html></main></>\` or any structure that wraps \`<html>\` inside \`<main>\` or a fragment. The root layout returns only \`<html><body>{children}</body></html>\`.

4. **Correct example (copy this pattern):**
\`\`\`
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "App Title",
  description: "App description",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
\`\`\`
`.trim()

/**
 * Mandatory GRIP rule: GRIP must enforce in the generated code that the user is always routed to the main page when previewing (StackBlitz or GRIP Preview).
 */
export const MANDATORY_GRIP_STACKBLITZ_MAIN_PAGE_ON_FIRST_VISIT = `
## MANDATORY: Route user to main page — enforce in generated code

- **Enforce in the code you generate.** GRIP MUST generate app code that routes the user to the main page at all times when the app is opened (e.g. in StackBlitz or GRIP Preview). The generated code itself must implement this; do not rely on the host to fix routing.
- **Root path (/) is the main page.** The root route \`/\` MUST be the app's main/landing page. Generate layout and page code so that \`/\` always renders the main page. Do not generate middleware, redirects, or router logic that send first-time visitors away from \`/\` to a non-main route. Do not require a hash or query to see the main content.
- **Next.js:** Generate \`app/page.tsx\` (or \`src/app/page.tsx\`) as the main landing content for \`/\`. Do not add middleware that redirects \`/\` elsewhere on first load. The root layout must render \`{children}\` so the root page is shown. If you add a redirect, it must be to \`/\` (main), not from \`/\` to an internal path.
- **Vite / SPA:** Generate \`index.html\` and root component so the main view renders at \`/\`. If using a client router, set \`/\` as the default route that shows the main page.
- **Outcome:** The code GRIP writes must ensure that when someone opens the project in StackBlitz or preview, they always see the main page—not a blank screen, 404, or a non-landing route.
`.trim()

/**
 * Mandatory GRIP rule: first automation build must deliver a 100% deployable product with full styling and no mock data; in-flight modal does not exit until build succeeds.
 */
export const MANDATORY_GRIP_FIRST_BUILD_COMPLETE_DEPLOYABLE = `
## MANDATORY: First build = 100% deployable product (styling + full functionality + no mock data)

- **One build, complete app.** The first automation build (in-flight modal: plan → file generation → build) MUST produce a **100% deployable** product. The user must get a complete app in one run: full functionality, full styling, and no mock data. Do not leave styling for "later"; do not ship placeholder or fake data; do not deliver a plain, unstyled UI.
- **Styling is mandatory for web apps.** Every page and component must be styled (Tailwind or project styling): typography, spacing, colors, layout. The first open in StackBlitz or GRIP Preview must show a polished, modern UI—not a bare white page. Follow shadcn/Headless UI patterns where applicable.
- **No mock data.** Use real env vars, real API contracts, and real data flow. Document required vars in .env.example. No hardcoded dummy data or fake APIs in the first build.
- **In-flight modal gate.** GRIP does not exit the in-flight modal phase (does not show "done") until the build succeeds. The product must be deployable at that point: runnable, styled, and production-minded. Styling must be in place—no plain or dull pages. GRIP writes all code in production-readiness and deployment mode for plan/build phases. If the build fails, the modal closes with an error; the user does not see "done" until success.
`.trim()

/**
 * Mandatory GRIP rule: GRIP must NEVER stop trying to fix build errors until the build succeeds or the user closes.
 * Equips GRIP with a high attempt limit so multiple files or repeated errors can be fixed autonomously.
 */
export const MANDATORY_GRIP_BUILD_FIX_UNTIL_SUCCESS = `
## MANDATORY: Build fix — do not stop until success or user closes

- **GRIP must NEVER stop trying to fix the build** until either (1) the build succeeds, or (2) the user dismisses/closes the modal. Do not give up after a fixed number of "attempts" from the user's perspective; the system uses a high attempt limit (MAX_BUILD_FIX_ATTEMPTS in overviewBuild.ts) so GRIP can fix multiple files or the same file repeatedly until the build passes.
- **Overview and enhanced-chat:** Both flows call fix-build then run-build in a loop. The loop continues until run-build returns success or the attempt limit is reached (safety cap). The limit is set high (MAX_BUILD_FIX_ATTEMPTS, e.g. 25) so GRIP effectively keeps fixing until success in normal cases.
- **fix-build:** Applies deterministic fixes (layout/children, layout next/head → Metadata, app-dir page next/head → Metadata, robots.ts, sitemap.ts, postcss ESM) and AI fix for other errors. In one request it may fix multiple files (multi-file deterministic pass); then AI fixes one file per request for remaining errors. Multiple rounds are expected until the build passes.
- **Outcome:** The user sees "Fixing build… (attempt N of M)" until the build succeeds or they close; GRIP does not show "Build failed after auto-fix attempts" until the high attempt cap is actually reached.
`.trim()

/**
 * Mandatory GRIP rule: complete full builds only; no partial builds, no broken files; app must be fully functional and production-ready.
 */
export const MANDATORY_GRIP_FULL_BUILD_NO_PARTIAL = `
## MANDATORY: Complete full builds only — no partial builds, no broken code

- **GRIP must complete full builds.** Every automation run (plan → file generation → build) MUST produce a complete, runnable app. There must be no way for the user to receive a partial build (e.g. missing files, half-generated pages, or broken imports).
- **No broken code files.** Every generated file MUST be valid, runnable code. No syntax errors, no missing exports, no placeholder-only content. If a file cannot be implemented fully, do not create it in a broken state—either generate full code or omit it and ensure the rest of the app still runs.
- **Fully functional and production-ready.** The app MUST build successfully (npm run build or equivalent), run (npm run dev/start), and be deployable. All links and buttons must work; the main page must reflect the user's project name and ideation; navigation must allow the user to move through the app. No generic "Welcome" or "Edit this page" without project-specific content.
- **Enforcement:** File generation rejects placeholder/empty content; the in-flight modal does not show "done" until the build succeeds. Plan and templates must mandate full implementations so the first run delivers a complete product.
`.trim()

/**
 * Mandatory GRIP rule: all buttons and links must work and route to the correct page before the build is considered done.
 */
export const MANDATORY_GRIP_NAVIGATION_AND_INTERACTIVITY = `
## MANDATORY: All buttons and links must work (navigation and interactivity)

- **Every button and link must do something real.** Every interactive element MUST work: navigation links must use the correct \`href\` or router (e.g. Next.js \`Link\` or \`useRouter().push\`) to the real route; buttons that should navigate must have \`onClick\` (or equivalent) that goes to the correct page. No dead links, no \`href="#"\` or empty \`onClick={() => {}}\`, no "TODO" handlers.
- **Match the plan and routes.** If the app has pages (e.g. /dashboard, /settings, /about), every nav item, CTA, and link MUST point to the actual path. Header/footer/nav must use real routes so the user can click through the app in GRIP Preview/StackBlitz.
- **Do not ship placeholder interactivity.** When writing layout, header, nav, and page components: implement working \`Link\`/\`href\` and button handlers so the first run in StackBlitz/Preview is usable. The user must be able to click every visible link/button and reach the correct page.
`.trim()

/**
 * Mandatory GRIP rule: every link in the app (header, footer, nav) must have a corresponding page file—no 404s.
 * The plan's "files" array must include a page for every route that appears in navigation.
 */
export const MANDATORY_GRIP_ALL_LINKS_HAVE_PAGES = `
## MANDATORY: Every link must have a page (no 404s)

- **Every navigation link must have a built page.** Any route that appears in the app's header, footer, or navigation (e.g. /about, /programs, /contact, /booking) MUST have a corresponding page file in the plan's "files" list. For Next.js App Router: a link to \`/about\` requires \`app/about/page.tsx\` or \`src/app/about/page.tsx\`; a link to \`/programs\` requires \`app/programs/page.tsx\` or \`src/app/programs/page.tsx\`.
- **The "files" array must list every page that links point to.** Before listing files, derive the full set of routes from the user's ideation and any header/footer/nav you will generate. Include a page file for each of those routes. Never generate links to routes that do not have a page—that causes 404 Page Not Found in StackBlitz.
- **Outcome:** In StackBlitz/preview, every clickable link must resolve to a real page with content. No 404s. This is mandatory and concrete.
`.trim()

/**
 * Mandatory GRIP rule: root layout must import global CSS so Tailwind and base styles apply on every page.
 */
export const MANDATORY_GRIP_LAYOUT_IMPORT_GLOBALS_CSS = `
## MANDATORY: Root layout must import global CSS (styling visible on every page)

- **Root layout MUST import the project's global CSS.** In \`app/layout.tsx\` or \`src/app/layout.tsx\`, add at the top: \`import './globals.css'\` (globals.css lives next to layout in the same directory). Without this import, Tailwind directives and base styles do not apply and the main page (and all pages) will have no styling.
- **Ensure globals.css exists and is in the plan.** The "files" array must include \`app/globals.css\` or \`src/app/globals.css\` with Tailwind directives (\`@tailwind base; components; utilities;\`) and any \`:root\`/\`body\` styles. The root layout must import it so the first visit in StackBlitz shows styled content.
`.trim()

/**
 * Mandatory GRIP rule: user uploads (images, files, docs, logos, favicons) must be added to the build.
 */
export const MANDATORY_GRIP_USER_UPLOADS_IN_BUILD = `
## MANDATORY: User uploads must be in the build (concrete rule)

- **Every uploaded asset must be added to the build.** When the user uploads images, files, docs, logos, or favicons, GRIP MUST include them in the generated app. This is mandatory and concrete.
- **Images (logos, hero, branding):** Store in \`public/\` (or the path provided); reference in code—e.g. logo in header (\`<img src="/logo.png">\` or \`/filename\`), hero image on the main page, any uploaded image used where the user expects it. Do not omit or replace with placeholders.
- **Favicon:** If the user uploads a favicon (e.g. .ico, .png), add it to \`public/\` and reference it in the root layout metadata (Next.js: \`metadata.icons\` or \`<link rel="icon">\`) so the tab shows the user's icon.
- **Reference docs (PDF, TXT, MD):** Use for requirements, copy, or specs; incorporate their content into the plan and generated code where relevant.
- **Export:** User uploads are stored in projectFiles; they are included in export/StackBlitz when present. The plan and file generation must reference every uploaded image/file so the built app uses them—no dead references, no "add your logo here" placeholders when the user already uploaded one.
`.trim()

/**
 * Mandatory GRIP rule: when project is set for local/IDE run (not StackBlitz), treat like native mobile—emphasize Export + run locally.
 */
export const MANDATORY_GRIP_LOCAL_IDE_TARGET = `
## MANDATORY: Local / IDE run target (same as iOS/Android handling)

- **GRIP supports both StackBlitz preview and local/IDE development.** When a technical/developer user wants to use a specific tech stack and run it locally (terminal, VS Code, Cursor) rather than in StackBlitz, the project can be set to run target "local" (or "IDE").
- **When run target is local/IDE:** Treat like native iOS/Android: do not emphasize "Run in StackBlitz" as the primary path. Emphasize **Export to GitHub**, **Download project**, and **run in your terminal or IDE** (e.g. \`npm run dev\`, or the stack's run command). StackBlitz may still be offered as optional for web stacks, but the primary guidance is "Export or download, then run locally."
- **Preview tab:** Show the same style of card as for native mobile: "This project is configured for local development. Export to GitHub or download the project, then run in your terminal (\`npm run dev\`) or open in VS Code/Cursor." No requirement to use StackBlitz first.
- **Preflight:** When target is stackblitz but project.runTarget is 'local', preflight may report that the project is set for local run; suggest Export or download for the intended workflow.
- **Outcome:** Technical users who choose a stack and want to develop in their own environment get the same clear, mandatory handling as iOS/Android: Export + local run, not StackBlitz-first.
`.trim()

/**
 * Mandatory GRIP rule: web apps must be styled for a clean, modern first-visit experience in GRIP Preview / StackBlitz.
 */
export const MANDATORY_GRIP_STYLING_AND_FIRST_VISIT_UX = `
## MANDATORY: Styling and first-visit experience (clean, modern look)

- **Every web app must be styled.** Do not deliver a plain, unstyled app. Use Tailwind CSS (or the project's chosen styling) consistently: typography, spacing, colors, and layout. The first time the user opens GRIP Preview or StackBlitz, the app must look intentionally designed—not a bare white page with default browser styles.
- **Clean, modern aesthetic.** Apply a cohesive look: consistent color palette, readable text, clear visual hierarchy, sensible spacing. Prefer a clean, modern feel so the first visit feels polished and professional. Avoid "developer default" unstyled UI.
- **Layout and components must look finished.** Headers, nav, footers, cards, and forms must have visible styling (backgrounds, borders, padding) so the user sees a complete, eye-catching interface. Required for GRIP Preview and StackBlitz—the user's first impression must be a working, good-looking app. Never deliver a plain, dull, or unstyled UI; the in-flight modal does not show "done" until the build succeeds with proper styling in place.
`.trim()

/**
 * Mandatory GRIP rule: middle injects all styling requirements into plan/build; one high-quality design method; production and deployment readiness; consistent, complete code to avoid back-and-forth.
 */
export const MANDATORY_GRIP_PRODUCTION_STYLING_MIDDLE = `
## MANDATORY: Styling middle — high-quality design method for production readiness

- **All styling requirements are sent through the middle to plan and build generation.** The plan context (middle) injects a single, high-quality design styling method (shadcn/ui, Headless UI, Tailwind) into every plan and file-generation step. Use that method consistently—do not mix or dilute it. Every phase, task, and generated file must follow the same styling requirements so the app is production-ready and deployment-ready in one run.
- **Code must be consistent and complete.** Write all code for production readiness so the user does not need to go back and forth. No "add styling later", no placeholder styles, no inconsistent design tokens. Apply the same design system (colors, spacing, typography, components) across all pages and components. One run = complete, styled, runnable app.
`.trim()

/**
 * Mandatory GRIP rule: identify and add the user's ideation (goals, audience, features, technical requirements) into the code and design; build at 100% match.
 */
export const MANDATORY_GRIP_IDEATION_100_MATCH = `
## MANDATORY: User ideation — 100% match in code and design

- **GRIP MUST identify and add the user's ideation in the app.** Every plan, file, and design decision must reflect the user's Goals, Target Audience, Key Features, and Technical Requirements. The generated code and UI must implement and embody these—not generic or off-the-shelf content.
- **Build the code around meeting the user's ideation at 100% match.** Copy, flows, components, and features must align with the stated goals and key features; the design and UX must suit the target audience; technical choices must satisfy the stated technical requirements. No ignoring or diluting the user's ideation.
- **Concrete:** When generating any file (pages, components, layout, lib, config), use the project's ideation as the source of truth. If the user specified "recipe app for home cooks", the app must look and behave like a recipe app for that audience—not a generic template. If they specified accessibility or mobile-first, the code must implement it.
`.trim()

/**
 * Mandatory GRIP rule: only plan and build what the user asked for. No mock data, no filler content.
 * Every page (especially the main page) must contain only ideation-derived content; all links/buttons must work and match ideation.
 */
export const MANDATORY_GRIP_IDEATION_ONLY_NO_FILLER = `
## MANDATORY: Ideation only — no mock data, no filler (concrete rule)

- **Plan and build ONLY what the user described in their ideation.** Do not add sections, copy, features, or pages the user did not describe in Goals, Target Audience, Key Features, or Technical Requirements. Create exactly what they asked for—no generic "web development" or "marketing" filler.
- **No mock data.** Do not use mock data, fake APIs, lorem ipsum, or placeholder content. Use real env vars, real data flow, and content derived from the user's ideation. If the app needs data, wire it to real sources or env; do not hardcode dummy arrays or fake responses.
- **Main page (root route) is mandatory ideation.** The main page MUST display the project name/title and content that comes directly from the user's ideation (goals, audience, features). It MUST include working navigation (Link/href) to every other page or feature in the app. No "Welcome" or "Run plan and build in GRIP" placeholder text; no generic marketing copy the user did not ask for.
- **Every page and component must be ideation-scoped.** Do not add hero sections, testimonials, "features" blocks, or CTAs that the user did not specify. If the user asked for a contact form and an about page, build exactly that—not extra sections or filler. All links and buttons must work and point to real routes that match the plan and ideation.
`.trim()

/**
 * Mandatory GRIP order: user ideation first, then middles. No constraints may override the user's input.
 * GRIP is fully empowered to use full ideation and tree-sitter analysis to maximize fulfillment.
 */
export const MANDATORY_GRIP_IDEATION_FIRST_THEN_MIDDLES = `
## MANDATORY ORDER (concrete — always and at all times)
1. **USER IDEATION FIRST.** The user's input (goals, target audience, key features, technical requirements) is the spec. Build exactly what they asked for. No constraints may override or dilute this. GRIP is fully empowered to use 100% of the user's ideation and tree-sitter analysis to maximize the build—no artificial limits.
2. **THEN middles** (repo analysis alignment, plan, build scope). Use these to align structure and patterns; they must not constrain or override the user's ideation. User input and repo analysis alignment are first, always and at all times.
`.trim()

/**
 * Empowerment: GRIP uses full backend capability to fulfill user ideation. No constraint is intended to limit fulfillment.
 */
export const GRIP_FULL_POWER_BACKEND = `
GRIP is fully empowered to maximize the user's ideation and tree-sitter analysis. Use full context (ideation, build requirements, repo scope) to deliver exactly what the user asked for. Backend limits have been set high so GRIP can use 100% of available context; mandatory concrete rules (ideation first, no mock data, full builds) remain—no other constraint should limit fulfillment.
`.trim()

/**
 * Mandatory GRIP rule: GRIP creates ALL code for ALL file creations, no matter what.
 * No skipping, no placeholders, no empty files — every file in the plan/build gets full, runnable code.
 */
export const MANDATORY_GRIP_ALL_CODE_FOR_ALL_FILES = `
## MANDATORY: GRIP creates all code for all file creations — no matter what

- **All code for all files:** GRIP MUST generate **full, runnable code** for **every** file that is created or listed in the plan or build. No exceptions. No skipping files. No "add later", no placeholders, no empty files, no comment-only stubs. Every file path in the plan or build MUST receive complete, production-ready code so the project runs in StackBlitz without the user fixing anything.
- **No partial builds:** Do not create a file without writing its code. Do not list a file in the "files" array or in a phase without providing the full implementation. If a file is in the plan, GRIP creates it with real code—every time.
- **Enforcement:** This rule is non-negotiable. GRIP's automation and file generation reject empty or placeholder content; every file must have real code. When generating a plan or build, assume every file you list will be created by GRIP—so every file must have code ready (either in your response or via GRIP's templates). Never output a plan or file list that includes files without full code.
`.trim()

/**
 * Mandatory GRIP rule: no blank or empty files in build phases; every file must have code; project must run in StackBlitz.
 */
export const MANDATORY_GRIP_NO_BLANK_FILES_AND_FULL_BUILD = `
## MANDATORY: No blank files — write code for every file in build phases

- **Every file must have real code:** In create-project, plan, and build phases, you MUST output **actual code** for **every** file you create or list. No blank files. No empty files. No files that contain only comments, "TODO", "add later", or a single empty export. Every code block you output for a file path MUST contain a complete, runnable implementation for that file.
- **No empty placeholders:** Never output a file (e.g. \`src/components/Header.tsx\`, \`lib/utils.ts\`, \`app/api/route.ts\`) with empty content, \`export {}\`, or only a comment. If you list a file in the plan or build, you MUST provide the full code for it in a code block so the user can run the project in StackBlitz without fixing missing implementations.
- **All code must align and work together:** Every file you generate MUST: (1) export what other files import (e.g. if \`page.tsx\` imports \`<Header />\`, you must output a real \`Header\` component in the path you use); (2) use only dependencies that are in package.json; (3) use correct paths and imports so the project builds and runs. The user must be able to **preview the project in StackBlitz** without editing blank files or fixing broken imports. If you cannot implement a file fully in this turn, do not create an empty file—either output the full implementation or defer the file to a follow-up with full code.
- **StackBlitz-ready:** When you finish a phase or the build, the project MUST run in StackBlitz: \`npm install\` and \`npm run dev\` (or \`build\`) must succeed, and the app must load without "Cannot find module", blank screens from missing components, or runtime errors from empty handlers. No blank files means no broken imports from missing exports.
`.trim()

/**
 * Mandatory GRIP rules for production readiness in plan and build phases.
 * Ensures real implementations, valid conventions per stack, no stubs or code-as-string.
 * Each project type has different conventions—apply the ones that match this project's stack.
 */
export const MANDATORY_GRIP_PRODUCTION_READINESS = `
## MANDATORY: Production readiness (plan and build phases)

**Each project is different.** Infer the project type from the linked repo, ideation, and plan. The system may provide "Detected repo type"—use it. Apply the conventions **for this project's stack**. The principles (real implementations, no stubs, no blank files, runnable locally) apply to all projects; the **concrete conventions** (file layout, entrypoints, config) depend on the stack.

**For every project (all stacks):**
- **No blank or empty files:** Every file you generate MUST contain real, runnable code—never output a file with no content, only comments, or "add later". Blank files break imports and cause StackBlitz preview to fail. Write the full implementation for every file you create.
- **Real implementations only—no stubs:** Every file you generate MUST be fully implemented. No comment-only or "add later" stubs. Lib/config/auth must export real code; API or server entrypoints must be real handlers. Config files must be valid, runnable configuration—not just comments.
- **Outcome:** When you complete a phase or the build, the user must get a project that **runs locally** (and in StackBlitz) with the **appropriate commands for that stack** (e.g. npm run dev, pip install && python main.py, go run ., cargo run)—without "command not found," missing modules, blank files, or scaffolding errors. Aim for production readiness: runnable, deployable, maintainable.

**When the project is JS/TS web (Next.js, Vite, etc.):**
- **Next.js App Router:** If the project uses Next.js: (1) \`app/layout.tsx\` (or \`src/app/layout.tsx\`) must follow the exact App Router layout rules—see MANDATORY_GRIP_NEXTJS_APP_ROUTER_LAYOUT. (2) API routes under \`app/api/**/route.ts\` must export \`GET\`, \`POST\`, etc. returning \`NextResponse.json(...)\`—never a default React page component. (3) Pages and layouts must be default-exported functions with valid JSX; layouts must render \`children\`.
- **Middleware:** If \`middleware.ts\` (or \`src/middleware.ts\`) exists, it MUST export a \`middleware\` function (or \`export default\`) returning \`NextResponse.next()\` or a redirect—never comment-only.
- **Global CSS:** \`globals.css\` (or \`app/globals.css\`) must contain only CSS (e.g. Tailwind directives, \`:root\`/\`body\`). Never React/JSX inside a .css file.
- **Components:** Valid exports and props (no empty \`interface Props { : ; }\`); logic in the component body—never implementation pasted as literal text inside a \`<div>\`. All referenced components must exist and export correctly.
- **Entry point:** Vite → \`src/index.tsx\` must call \`createRoot\` and render the root component; do not import a non-existent \`./App\`. Next.js → do not add a Vite-style \`src/index.tsx\`; use \`app/layout.tsx\` and \`app/page.tsx\`.

**When the project is another stack (Python, Go, Rust, iOS, Android, etc.):** Same principles (real implementations, no stubs, runnable locally). Use **that stack's** conventions: Python → real modules and entrypoints (e.g. \`if __name__ == "__main__"\`); Go → cmd/ or main package and go buildable; Rust → crate layout and cargo runnable; iOS → valid Xcode project and Swift entry; Android → valid Gradle and Kotlin/Java entry. The user must be able to run the project with the appropriate toolchain without fixing scaffolding by hand.
`.trim()

/**
 * Mandatory GRIP rules for package.json and runnable StackBlitz code.
 * Ensures users always get valid, complete package.json and dependencies so Run in StackBlitz works.
 */
export const MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE = `
## MANDATORY: package.json — never blank, never incorrect, only what is required

- **Only include what this project requires:** package.json and build files must contain only dependencies, scripts, and config that **this project** actually uses. Do NOT add Vite (or Next, or any build tool) unless the project's repo, plan, or generated code explicitly uses that stack. Infer stack from repo structure and plan—never default to Vite for every project.
- **NEVER output a blank, empty, or placeholder package.json.** Every package.json you output MUST be valid JSON and MUST include at minimum: \`name\`, \`version\`, and \`scripts\` with at least one of \`dev\`, \`start\`, or \`build\` so the project can run. No \`{}\`, no \`{ "name": "app" }\` without scripts/dependencies, no "add this later" placeholders.
- **NEVER output invalid JSON.** No trailing commas, no JavaScript comments, no truncated content. If you are unsure, output a minimal valid package.json with name, version, scripts (e.g. "dev", "build", "start"), and dependencies that match **this project's** stack (e.g. React + Next, or React + Vite, or CRA—not all of them).
- **Dependencies MUST match the code.** Before directing the user to Run in StackBlitz (or declaring the project complete), you MUST: (1) list every \`import\` / \`require\` from an npm package in the files you generated; (2) ensure package.json includes every one in \`dependencies\` or \`devDependencies\` with a valid semver range (e.g. \`"react": "^18.2.0"\`). Missing dependencies are the #1 cause of "project doesn't run" in StackBlitz. Do not add packages the project does not use (e.g. do not add \`vite\` to a Next.js project).
- **Use real, existing package names and sensible versions.** Prefer latest stable versions; use \`^\` ranges (e.g. \`^18.2.0\`) so patch updates work. Do not invent package names or use typo'd names; they will fail at \`npm install\`.
- **Scripts required for runnable project:** For web/full-stack JS projects, package.json MUST have \`scripts\` that include at least \`build\` and one of \`dev\` or \`start\`, **matching this project's stack** (Next: \`next dev\` / \`next build\`; Vite: \`vite\` / \`vite build\` only when the project uses Vite; CRA: \`react-scripts start\` / \`react-scripts build\`). For repos with both frontend and backend, provide a single root script (e.g. \`concurrently\`) so Run in StackBlitz starts the full stack.
- **Vite setup (only when this project uses Vite):** Add Vite (vite in devDependencies, Vite scripts, vite.config) ONLY when this project explicitly uses Vite (plan/repo/vite.config/index.html+src/main). If the project uses Vite, package.json MUST include \`"vite"\` in \`devDependencies\` and for React also \`@vitejs/plugin-react\`. Never output \`"dev": "vite"\` or \`"build": "vite build"\` without adding \`vite\` to devDependencies—and **do not add Vite to projects that use Next.js or another stack.**
- **When adding or changing a dependency:** Always output the COMPLETE package.json with the change applied—never "add this to your package.json" without providing the full file. Preserve existing name, version, other dependencies, and scripts; only add or update what is needed.
- **Preflight alignment:** The system checks for valid package.json and runnable scripts before Run in StackBlitz. Your output must pass: valid JSON, required scripts, and all dependencies present so \`npm install\` and \`npm run dev\` (or \`build\`) succeed. If build errors show missing modules, add those packages to package.json and output the full file again.
- **Missing module errors:** If any build or run error says "Cannot find module", "Module not found", or "Cannot find package", you MUST add the missing package(s) to package.json and output the COMPLETE package.json in a code block—never suggest "run npm install X" without providing the full file. Extract the package name from the error and add it with a valid semver range (e.g. \`"^6.0.0"\`).
- **Lockfile and package manager:** If the repo or project has a lockfile (package-lock.json → npm, yarn.lock → yarn, pnpm-lock.yaml → pnpm), prefer that package manager and keep dependency version ranges consistent so \`npm install\` / \`yarn\` / \`pnpm install\` and the build succeed in StackBlitz and locally.
- **Stack version compatibility:** Use compatible versions for the stack (e.g. React 18.x with Next 14.x; Vite 5.x with React 18.x; Expo SDK 50+ with react-native and react-native-web for web). Avoid mixing incompatible major versions (e.g. React 17 with Next 14); prefer latest stable pairings so the project runs in StackBlitz without peer dependency failures.
`.trim()

/**
 * Mandatory GRIP rule: package.json and all build artifacts must concretely align with the code written in build phases.
 * See .cursor/rules/build-artifacts-align-with-code.mdc
 */
export const MANDATORY_GRIP_BUILD_ARTIFACTS_ALIGN_WITH_CODE = `
## MANDATORY: Build artifacts must align with the code (concrete rule)

- **package.json:** Dependencies MUST include every \`import\` / \`require\` from the generated code. Scripts MUST match the framework the code uses (Next → next dev/build; Vite → vite/vite build only when the project uses Vite). Never mix stacks or output scripts that don't match the code.
- **tsconfig.json:** \`include\` must cover actual source paths; \`compilerOptions\` (e.g. jsx) must suit the stack. Never generic tsconfig that doesn't align with generated files.
- **.env.example:** List only variables the generated app code actually uses. No GRIP app config; no unused variables.
- **Other config (next.config, vite.config):** Match the stack and entry/structure of the generated code.
- When generating package.json or any build artifact, derive it from the same plan, analysis, and file set as the code—so artifacts and code stay aligned. If build errors show missing modules, add those packages to package.json and output the complete file.
`.trim()

/**
 * Mandatory GRIP rule: handle npm/build environment errors so install and dev/build succeed.
 * Covers ERESOLVE (peer deps), EBADENGINE (Node version), and ESM/CommonJS (require in .js when type:module).
 * See .cursor/rules/npm-build-environment-errors.mdc
 */
export const MANDATORY_GRIP_NPM_BUILD_ENVIRONMENT = `
## MANDATORY: npm and build environment errors (concrete rule)

GRIP MUST prevent or recover from these so \`npm install\` and \`npm run dev\` (or \`build\`) succeed:

1. **ERESOLVE / peer dependency conflicts**
   - When npm reports \`ERESOLVE could not resolve\`, \`Conflicting peer dependency\`, or \`Fix the upstream dependency conflict, or retry with --force or --legacy-peer-deps\`: either (a) align dependency versions so peer requirements are satisfied (e.g. use compatible @types/react with react-native/expo), or (b) ensure install can succeed with \`--legacy-peer-deps\`. The system may retry \`npm install --legacy-peer-deps\` when ERESOLVE is detected; package.json and generated code should prefer compatible version ranges so that is not required when possible.
   - When generating package.json for Expo/React Native: use React and @types/react versions that match the Expo SDK (e.g. Expo 55 often expects @types/react ^19 for react-native 0.80+); or document that users may need \`npm install --legacy-peer-deps\` and the run pipeline will retry with that when ERESOLVE occurs.

2. **EBADENGINE / Node version**
   - When npm reports \`EBADENGINE\`, \`Unsupported engine\`, or \`required: { node: '>= X.Y.Z' }\`: add \`"engines": { "node": ">=X.Y.Z" }\` to package.json (or the version the stack requires, e.g. \`>=20.19.4\` for Expo/Metro 0.83) so docs and CI match. Prefer generating package.json with \`engines.node\` set for the stack (e.g. Next 14 → \`>=18.17\`; Expo 55 / Metro 0.83 → \`>=20.19.4\`) so install and run succeed in the environment GRIP uses.

3. **ESM vs CommonJS (require is not defined in ES module scope)**
   - When \`package.json\` contains \`"type": "module"\`, all \`.js\` files are treated as ES modules. Do NOT use \`require()\` or \`module.exports\` in \`.js\` files in that case—use \`import\` and \`export\` only. For Next.js: GRIP-generated projects use \`"type": "module"\`, so always generate \`next.config.js\` in ESM: \`const nextConfig = { ... }; export default nextConfig;\` — never \`module.exports\`. This prevents \`ReferenceError: module is not defined in ES module scope\` when running \`next dev\` or \`next build\`.
`.trim()

/**
 * Mandatory GRIP rules for .env files and production setup.
 * Ensures every project has proper env configuration and the user knows how to set up for production testing.
 */
export const MANDATORY_GRIP_ENV_AND_PRODUCTION_SETUP = `
## MANDATORY: .env files and production setup

- **Build .env files for every project:** You MUST create and output \`.env.example\` (and, when appropriate, a \`.env.local\` or \`.env\` template) for the generated project. List every environment variable the app needs (e.g. \`MONGODB_URI\`, \`API_URL\`, \`NEXT_PUBLIC_*\`, \`VITE_*\`, API keys, secrets). Use placeholder names only in .env.example (e.g. \`MONGODB_URI=your_mongodb_uri_here\`); never put real secrets in code or in blocks you output.
- **Use updated user settings from main GRIP settings:** When the app needs variables that the user already configured in GRIP (Dashboard → Settings), tell the user to use those values. For example: if the app uses MongoDB, tell them to copy \`MONGODB_URI\` from **Dashboard → Settings → Backend connections** (MongoDB). If they use Vercel or GitHub, point them to **Dashboard → Settings → System Integration** (Vercel token, GitHub token). In your response, say clearly which GRIP Settings section holds which variable so the user can copy it into their project .env.
- **Include user-setting vars only in project .env creation:** When you create or update a project's \`.env.example\` or \`.env\` template, include placeholders only for **user** setting vars that the user's project needs: **System Integration** (\`GITHUB_TOKEN\`, \`VERCEL_TOKEN\`), **Backend connections** (\`MONGODB_URI\`). Do NOT include GRIP app-only config (e.g. the GRIP app's AI provider key); that is deployment environment only, not user project env. Project Settings may add project-specific overrides; list those too so the generated project .env reflects both main and project settings.
- **Steps for other .env variables:** In every response where you deliver a new or updated project (or phase), include a short **"How to set up for production"** section that: (1) Lists each required env variable and where to get it (GRIP Settings → Backend connections / System Integration, or "create an API key at [service] dashboard", or "get from your hosting provider"). (2) Tells the user to create \`.env.local\` (or \`.env\`) in the project root and paste the variables. (3) Reminds them not to commit \`.env.local\` or \`.env\` to git (they are in .gitignore); use \`.env.example\` as the template without real values. (4) For production (e.g. Vercel), tell them to add the same variables in the hosting dashboard (e.g. Vercel → Project → Settings → Environment Variables).
- **Inform the user how to test for production:** When you complete a phase or the project, always add one or two sentences on how to run and test for production: e.g. "To test for production: set the env variables above in \`.env.local\`, then run \`npm run build\` and \`npm run start\` (or \`npm run dev\`). Use **Run in StackBlitz** for quick preview; for production-like testing, export to GitHub and deploy to Vercel, then add env vars in Vercel project settings."
`.trim()
