/**
 * Mandatory GRIP build-quality plan.
 * Injected into plan generation and enhanced chat so every build follows the same bar:
 * latest stable libraries, modern UX/UI, clean design, best practices.
 * Reduces token waste by getting the first build right.
 */

/** MANDATORY: GRIP uses only env; Settings vars are for the user's app build only. */
export const MANDATORY_GRIP_APP_VS_USER_SETTINGS = `
## MANDATORY: GRIP app vs user settings (never mix)

- **GRIP app** uses **only** environment variables: .env / .env.local in dev, Vercel (or deployment) vars in production. GRIP must **never** read Dashboard → Settings for its own backend (e.g. AI, plan, build execution). ANTHROPIC_API_KEY and any GRIP backend config come from deployment env only.
- **User Settings vars** = what users enter in Dashboard → Settings (Backend connections, System Integration, etc.). GRIP uses these **only** to inject into the **user's project** when building their app: GRIP adds them to the project-specific .env file for the user's build. Settings vars are for the user's app, not for GRIP's own functionality.
- **Rule:** GRIP code must never read Settings for GRIP's AI or backend. Errors for GRIP AI/deployment must direct users to set vars in deployment (e.g. Vercel env vars or .env.local). When the **user's project** needs a var (e.g. MONGODB_URI), point them to Dashboard → Settings → Backend connections so they can copy into their project .env.
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
 * Mandatory GRIP rules for project-specific scaffolding.
 * Each project type (JS/TS web, Python, Go, Rust, iOS, Android, etc.) uses different manifest files and commands—apply the same principles for that stack.
 */
export const MANDATORY_GRIP_PROJECT_SPECIFIC_SCAFFOLDING = `
## MANDATORY: Project-specific scaffolding (plan and build)

**Each project is different.** Infer the project type from the linked repo (structure, frameworks, languages), ideation, and plan. The system may provide "Detected repo type" and stack guidance—use it. Apply the rules below **for this project's stack**. The principles (project-specific config, runnable, no generic placeholders) apply to all projects; the **manifest files and commands** depend on the stack.

**For JS/TS web projects (Node/npm):**
- **package.json MUST be project-specific and runnable:** Never output empty \`dependencies\` or \`devDependencies\` (e.g. \`"dependencies": {}, "devDependencies": {}\`). Every generated project MUST list every package the codebase actually uses (from every \`import\` / \`require\`). Scripts MUST match the **actual framework** of the codebase: if the app uses Next.js (App Router, next/head, API routes under app/api), use \`"dev": "next dev"\`, \`"build": "next build"\`, \`"start": "next start"\`—never Vite scripts. If the app uses Vite, use \`"dev": "vite"\`, \`"build": "tsc && vite build"\` (or \`vite build\`), \`"preview"\` or \`"start": "vite preview"\`. Wrong scripts cause "command not found". Infer framework from file structure.
- **Vite projects: always add vite to devDependencies.** If you generate or use Vite (vite.config.*, scripts calling \`vite\`, or Vite-style \`index.html\` + \`src/main.tsx\`), package.json MUST include \`"vite"\` in \`devDependencies\`. Never output Vite scripts without the \`vite\` package—this causes "command not found: vite" in StackBlitz and local build. For React, also add \`@vitejs/plugin-react\` in devDependencies.
- **tsconfig.json MUST be project-specific:** \`include\` must cover actual source paths; \`compilerOptions\` must suit the stack (e.g. \`"jsx": "preserve"\` for Next.js, \`"jsx": "react-jsx"\` for Vite). Never output a generic tsconfig that does not align with the generated files.

**For other stacks (Python, Go, Rust, iOS, Android, etc.):** Apply the same principles using that stack's manifest and run commands: Python → requirements.txt or pyproject.toml and pip/poetry install + run command; Go → go.mod and go build/go run; Rust → Cargo.toml and cargo run; iOS → Xcode project and Package.swift; Android → build.gradle and Gradle. Never empty or wrong-command manifests. The user must be able to install and run with the **appropriate** commands for that stack.

**For every project (all stacks):**
- **README.md MUST be project-specific:** Describe **this project** by name and purpose. Include: (1) project name and short description, (2) getting started using **this project's** install/run commands (npm/pip/go/cargo/etc.), (3) main features or usage relevant to this app, (4) tech stack used. NEVER a copy of .env.example, generic "GRIP" text, or a template with no project-specific content.
- **Env/config MUST be project-specific:** List only variables **this app** actually uses (e.g. NextAuth → NEXTAUTH_SECRET, NEXTAUTH_URL; Prisma → DATABASE_URL; Python → API_KEY, DATABASE_URL). Do not paste GRIP Dashboard variables unless the generated app needs them. Document each variable briefly. For non-Node projects, use that stack's config (e.g. .env, config.yaml, environment in README).
`.trim()

/**
 * Mandatory GRIP rules for production readiness in plan and build phases.
 * Ensures real implementations, valid conventions per stack, no stubs or code-as-string.
 * Each project type has different conventions—apply the ones that match this project's stack.
 */
export const MANDATORY_GRIP_PRODUCTION_READINESS = `
## MANDATORY: Production readiness (plan and build phases)

**Each project is different.** Infer the project type from the linked repo, ideation, and plan. The system may provide "Detected repo type"—use it. Apply the conventions **for this project's stack**. The principles (real implementations, no stubs, runnable locally) apply to all projects; the **concrete conventions** (file layout, entrypoints, config) depend on the stack.

**For every project (all stacks):**
- **Real implementations only—no stubs:** Every file you generate MUST be fully implemented. No comment-only or "add later" stubs. Lib/config/auth must export real code; API or server entrypoints must be real handlers. Config files must be valid, runnable configuration—not just comments.
- **Outcome:** When you complete a phase or the build, the user must get a project that **runs locally** with the **appropriate commands for that stack** (e.g. npm run dev, pip install && python main.py, go run ., cargo run, Xcode run, Gradle run)—without "command not found," missing modules, or scaffolding errors. Aim for production readiness: runnable, deployable, maintainable.

**When the project is JS/TS web (Next.js, Vite, etc.):**
- **Next.js App Router:** If the project uses Next.js: (1) \`app/layout.tsx\` (or \`src/app/layout.tsx\`) must be a default-exported function that accepts \`{ children }\` and returns \`<html><body>{children}</body></html>\`; use \`metadata\` export—never \`next/head\` or raw object literals in JSX. (2) API routes under \`app/api/**/route.ts\` must export \`GET\`, \`POST\`, etc. returning \`NextResponse.json(...)\`—never a default React page component. (3) Pages and layouts must be default-exported functions with valid JSX; layouts must render \`children\`.
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
## MANDATORY: package.json — never blank, never incorrect

- **NEVER output a blank, empty, or placeholder package.json.** Every package.json you output MUST be valid JSON and MUST include at minimum: \`name\`, \`version\`, and \`scripts\` with at least one of \`dev\`, \`start\`, or \`build\` so the project can run. No \`{}\`, no \`{ "name": "app" }\` without scripts/dependencies, no "add this later" placeholders.
- **NEVER output invalid JSON.** No trailing commas, no JavaScript comments, no truncated content. If you are unsure, output a minimal valid package.json with name, version, scripts (e.g. "dev", "build", "start"), and dependencies that match the stack (e.g. React, Vite, Next).
- **Dependencies MUST match the code.** Before directing the user to Run in StackBlitz (or declaring the project complete), you MUST: (1) list every \`import\` / \`require\` from an npm package in the files you generated; (2) ensure package.json includes every one in \`dependencies\` or \`devDependencies\` with a valid semver range (e.g. \`"react": "^18.2.0"\`). Missing dependencies are the #1 cause of "project doesn't run" in StackBlitz.
- **Use real, existing package names and sensible versions.** Prefer latest stable versions; use \`^\` ranges (e.g. \`^18.2.0\`) so patch updates work. Do not invent package names or use typo'd names; they will fail at \`npm install\`.
- **Scripts required for runnable project:** For web/full-stack JS projects, package.json MUST have \`scripts\` that include at least \`build\` and one of \`dev\` or \`start\`, matching the stack (e.g. Vite: \`vite\` / \`vite build\`, Next: \`next dev\` / \`next build\`, CRA: \`react-scripts start\` / \`react-scripts build\`). For repos with both frontend and backend, provide a single root script (e.g. \`concurrently\`) so Run in StackBlitz starts the full stack.
- **Vite setup (MANDATORY when using Vite):** If the project uses Vite (e.g. \`vite.config.ts\` or \`vite.config.js\`, scripts that call \`vite\` or \`vite build\`, or Vite-style entry like \`index.html\` + \`src/main.tsx\`), package.json MUST include \`"vite"\` in \`devDependencies\` (e.g. \`"vite": "^5.4.0"\`). Never output \`"dev": "vite"\` or \`"build": "vite build"\` without adding \`vite\` to devDependencies—omitting it causes "command not found: vite" in StackBlitz and local runs. For React + Vite, also add \`@vitejs/plugin-react\` in devDependencies so the Vite config can use it. Every package.json you output for a Vite project MUST list \`vite\` (and \`@vitejs/plugin-react\` when using React) so the build and preview work without the user having to fix it.
- **When adding or changing a dependency:** Always output the COMPLETE package.json with the change applied—never "add this to your package.json" without providing the full file. Preserve existing name, version, other dependencies, and scripts; only add or update what is needed.
- **Preflight alignment:** The system checks for valid package.json and runnable scripts before Run in StackBlitz. Your output must pass: valid JSON, required scripts, and all dependencies present so \`npm install\` and \`npm run dev\` (or \`build\`) succeed. If build errors show missing modules, add those packages to package.json and output the full file again.
- **Missing module errors:** If any build or run error says "Cannot find module", "Module not found", or "Cannot find package", you MUST add the missing package(s) to package.json and output the COMPLETE package.json in a code block—never suggest "run npm install X" without providing the full file. Extract the package name from the error and add it with a valid semver range (e.g. \`"^6.0.0"\`).
- **Lockfile and package manager:** If the repo or project has a lockfile (package-lock.json → npm, yarn.lock → yarn, pnpm-lock.yaml → pnpm), prefer that package manager and keep dependency version ranges consistent so \`npm install\` / \`yarn\` / \`pnpm install\` and the build succeed in StackBlitz and locally.
- **Stack version compatibility:** Use compatible versions for the stack (e.g. React 18.x with Next 14.x; Vite 5.x with React 18.x; Expo SDK 50+ with react-native and react-native-web for web). Avoid mixing incompatible major versions (e.g. React 17 with Next 14); prefer latest stable pairings so the project runs in StackBlitz without peer dependency failures.
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
