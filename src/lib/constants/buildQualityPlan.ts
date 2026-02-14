/**
 * Mandatory GRIP build-quality plan.
 * Injected into plan generation and enhanced chat so every build follows the same bar:
 * latest stable libraries, modern UX/UI, clean design, best practices.
 * Reduces token waste by getting the first build right.
 */

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
- **Steps for other .env variables:** In every response where you deliver a new or updated project (or phase), include a short **"How to set up for production"** section that: (1) Lists each required env variable and where to get it (GRIP Settings → Backend connections / System Integration, or "create an API key at [service] dashboard", or "get from your hosting provider"). (2) Tells the user to create \`.env.local\` (or \`.env\`) in the project root and paste the variables. (3) Reminds them not to commit \`.env.local\` or \`.env\` to git (they are in .gitignore); use \`.env.example\` as the template without real values. (4) For production (e.g. Vercel), tell them to add the same variables in the hosting dashboard (e.g. Vercel → Project → Settings → Environment Variables).
- **Inform the user how to test for production:** When you complete a phase or the project, always add one or two sentences on how to run and test for production: e.g. "To test for production: set the env variables above in \`.env.local\`, then run \`npm run build\` and \`npm run start\` (or \`npm run dev\`). Use **Run in StackBlitz** for quick preview; for production-like testing, export to GitHub and deploy to Vercel, then add env vars in Vercel project settings."
`.trim()
