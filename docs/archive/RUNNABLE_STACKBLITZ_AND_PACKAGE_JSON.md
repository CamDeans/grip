# Runnable StackBlitz & package.json — Mandatory Rules & Ideation

## Goal

Users must always get **runnable, complete code** that works in **Run in StackBlitz**. GRIP must never output blank or incorrect `package.json` files, and all libraries/dependencies must work after we set these rules in place.

## What We Implemented

### 1. Mandatory constant: `MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE`

- **Location:** `src/lib/constants/buildQualityPlan.ts`
- **Injected into:** Enhanced chat (`src/app/api/enhanced-chat/route.ts`) and legal-sandbox chat (`src/app/api/projects/[id]/legal-sandbox/chat/route.ts`)

**Rules (summary):**

- **Never blank, never incorrect:** Every `package.json` must be valid JSON with at least `name`, `version`, and `scripts` (dev/start/build). No `{}`, no placeholder-only objects.
- **Valid JSON only:** No trailing commas, no comments, no truncation.
- **Dependencies match code:** Before directing to StackBlitz (or declaring complete), GRIP must list every `import`/`require` and ensure `package.json` includes every one.
- **Real package names and sensible versions:** Use existing npm packages and semver ranges (e.g. `^18.2.0`).
- **Scripts required:** For web/full-stack, at least `build` and one of `dev` or `start`; for frontend+backend, a single root script (e.g. `concurrently`).
- **Full file only:** When adding/changing a dependency, output the COMPLETE `package.json`; never "add this to your package.json" without the full file.
- **Preflight alignment:** Output must pass preflight (valid JSON, required scripts, all deps) so `npm install` and the build succeed.

### 2. Strengthened prompt sections in enhanced-chat

- **"package.json: always provide full file"** — Now explicitly: "never blank, never incorrect"; deps must match code; if not in context, build minimal valid package.json with scripts and every dependency the code uses.
- **"MANDATORY: package.json when directing to StackBlitz or deployment"** — Explicit "never blank, never incorrect"; valid JSON and scripts; cross-check generated files for missing packages.

### 3. Legal-sandbox parity

- Same `MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE` block is injected into the legal-sandbox chat so sandbox projects also get runnable `package.json` and dependency rules.

---

## Strengthening (continued)

### Missing-module hint in enhanced-chat

When **lastRunErrors** contain "Cannot find module", "Module not found", "Cannot find package", or "ERR_MODULE_NOT_FOUND", the prompt injects a **mandatory** instruction: GRIP MUST add the missing package(s) to package.json and output the COMPLETE package.json in a code block.

### Lockfile hint in enhanced-chat

When **savedFiles** includes `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`, the prompt adds a line so GRIP prefers that package manager and keeps dependency version ranges consistent.

### Package.json validation in build runners

**runMainProject** and **runSandboxProject** now validate package.json **before** running `npm install`: invalid JSON or missing scripts (build/dev/start) return a clear error that is fed back into the chat so GRIP fixes package.json on the next turn.

### Legal-sandbox: full-stack root script

When the sandbox has both frontend and backend (e.g. `api/` and `app/`), GRIP MUST add a single root script (e.g. `concurrently`) so Run in StackBlitz starts both. Explicit rule added to legal-sandbox chat prompt.

---

## Ideation & Future Improvements

Ideas to keep runnable StackBlitz and dependencies robust:

1. **Preflight-style validation in prompt (optional)**  
   When build errors mention "Cannot find module 'X'", the system could inject a one-liner: "Add the missing package(s) to package.json and output the full file." We already direct GRIP to fix missing deps; optional: add a small "missing module → add to package.json" rule that references the last run errors.

2. **Lockfile hints**  
   If the repo has `package-lock.json` or `yarn.lock`, we could tell GRIP to prefer the same manager and version ranges that the lockfile uses, so StackBlitz and local runs stay consistent. (Not yet in prompts.)

3. **Version compatibility note**  
   For known stacks (Next, Vite, React 18, etc.), we could add optional hints like "Use React 18.x with Next 14.x" to avoid peer dependency warnings. Currently we say "latest stable" in build quality; could be refined per repo type.

4. **Import scanner (optional)**  
   A simple static scan of generated files for `import X from 'pkg'` / `require('pkg')` could warn when a package is missing from package.json; could be used to inject a hint into the prompt or to append to run errors.

5. **StackBlitz-specific limitations**  
   We already tell GRIP about Metro/React Native/Expo and WebContainers limits. Keep that in mind for any new stack types (e.g. native modules, Node-only backends that can’t run in browser).

4. **User-facing "Runnable in StackBlitz" checklist**  
   In Preview/Develop UI, we could show a short checklist: "Valid package.json ✓, Scripts (dev/build) ✓, Dependencies match code ✓" once we have any automated checks, so users know what GRIP is aiming for.

---

## References

- **Build quality:** `src/lib/constants/buildQualityPlan.ts` — `MANDATORY_GRIP_BUILD_QUALITY`, `MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE`
- **Enhanced chat prompt:** `src/app/api/enhanced-chat/route.ts` — package.json sections and StackBlitz rules
- **Legal-sandbox chat:** `src/app/api/projects/[id]/legal-sandbox/chat/route.ts` — same package.json/runnable block
- **Preflight:** `src/app/api/projects/[id]/preflight/route.ts` — validates package.json presence and JSON for StackBlitz
- **Run:** `src/lib/runMainProject.ts`, `src/lib/sandbox/runSandboxProject.ts` — require package.json and run npm install / build
