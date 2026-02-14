# Automation speed: what runs and how to speed it up

## Where automation runs

1. **Overview auto-run (new project)**  
   When the user opens a project Overview and the project has a repo but no plan yet, we run in sequence:  
   - Poll **analysis status** until ready (every 1s, up to ~2 min).  
   - **POST /api/projects/[id]/plan** — generate plan (LLM + planning logic).  
   - **POST /api/projects/[id]/plan/sync-state** — sync phase state.  
   - **POST /api/projects/[id]/files/generate** — generate files (LLM per phase/file).  
   Then we fetch state and show a success toast.

2. **Develop: build after each response**  
   After GRIP applies code blocks from a message, we run **runMainProject** (or sandbox equivalent):  
   - Write all project files to a temp dir.  
   - **npm install** (with `--no-audit --no-fund` to reduce work).  
   - **npm run build** (or `npm run dev` with timeout).  
   If the build fails, we re-ask GRIP with errors and re-run the build (up to 5 attempts).

## What makes it slow

- **Analysis polling:** Used to be 2s; now 1s so we detect completion sooner.  
- **Plan + file generation:** Both are LLM/API-bound; they must run in order (files depend on plan).  
- **npm install:** Network + disk; we use `--no-audit --no-fund` to avoid extra work.  
- **Build:** Depends on project size and tooling (Vite/Next/etc.).  
- **Build-fix loop:** Each retry is another LLM call + full install + build.

## Changes already made

- **Analysis poll interval:** 2000 ms → 1000 ms on Overview so analysis completion is detected faster.  
- **npm install:** Added `--no-audit --no-fund` in `runMainProject` and `runSandboxProject` to speed installs slightly.  
- **node_modules cache:** `runMainProject` and `runSandboxProject` use a shared cache keyed by a hash of `package.json` plus lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml). If the hash matches a previous run, we copy cached `node_modules` into the temp dir and skip `npm install`. After a successful install we copy `node_modules` into the cache and prune to a fixed number of entries (see `src/lib/nodeModulesCache.ts`). Cache root: `GRIP_NODE_CACHE` or `os.tmpdir()/grip-node-cache`.  
- **Quick-build timeout:** Build is first run with a 30s timeout. If it doesn’t complete (process killed, `status === null`), we retry once with the full 60s timeout. Fast builds finish sooner; slow builds still get the full window.

## Possible future improvements

- **Parallel work on Overview:** Plan and sync-state could stay sequential; file generation could start as soon as plan is ready (already the case). No low-effort parallelization left there.  
- **Background build:** Run build in a worker/queue and notify the client when done, so the user isn’t blocked. Requires infrastructure.  
- **Reduce MAX_BUILD_FIX_ATTEMPTS:** Fewer retries (e.g. 3) would stop sooner on repeated failures but might lower success rate.

Most of the perceived slowness comes from **LLM calls** (plan, file generation, fix attempts) and **npm install + build** in a temp dir. The changes above reduce waiting where we could without major re-architecture.
