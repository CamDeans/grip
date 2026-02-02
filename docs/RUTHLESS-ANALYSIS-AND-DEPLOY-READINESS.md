# G.R.I.P. — Ruthless Analysis & Deploy Readiness

**Purpose:** Where we are, where we're heading, what’s required to be top‑notch and deploy‑ready.  
**Mode:** Ruthless. No sugar‑coating.

---

## 1. How to Run the App (Quick Reference)

| Action | Command |
|--------|---------|
| **Install** | `npm install` |
| **Dev** | `npm run dev` → app at **http://localhost:3000** |
| **Build** | `npm run build` |
| **Start (prod)** | `npm start` |
| **Lint** | `npm run lint` |
| **Tests** | `npm test` or `npm run test:coverage` |
| **DB init** | `npm run db:init` (runs `ensureCollections.ts`) |
| **DB populate (new cluster)** | `npm run db:populate` (creates collections + optional seed user) |

**Auth:** NextAuth.js — **GitHub OAuth** + **Credentials (email/password)**.  
**Session:** JWT. Sign‑in page: `/login`.  
**Database:** **MongoDB Atlas** — `MONGODB_URI` in `.env.local`, DB name `test` in code (`lib/mongodb.ts`).  
**AI:** **Anthropic Claude** — `ANTHROPIC_API_KEY` in `.env.local`.  
**Real‑time:** Socket.IO + WebSocket (optional; `NEXT_PUBLIC_ENABLE_WEBSOCKET`, `WS_PORT`, etc.).

**Required env (see `.env.example`):**  
`MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ANTHROPIC_API_KEY`.  
Optional: `GITHUB_ACCESS_TOKEN` / `GITHUB_TOKEN`, WebSocket vars.

### Populating a new MongoDB cluster

After you recreate the cluster and set `MONGODB_URI` in `.env.local`:

1. **Create collections and optional credentials user**
   ```bash
   npm run db:populate
   ```
   - Creates NextAuth collections: `users`, `accounts`, `sessions`, `verification_tokens`.
   - Creates app collections used by the codebase (e.g. `projects`, `chatHistory`, `projectStates`, etc.).
   - Optional: set in `.env.local` to seed one credentials (email/password) user:
     - `SEED_USER_EMAIL` (e.g. `admin@example.com`)
     - `SEED_USER_PASSWORD`
     - `SEED_USER_NAME` (optional, default: "G.R.I.P. Admin")

2. **Create Mongoose collections and indexes**
   ```bash
   npm run db:init
   ```
   This runs `ensureCollections.ts` and registers Mongoose models/indexes.

3. **Run the app**
   ```bash
   npm run dev
   ```
   Sign in with GitHub OAuth or with the seeded credentials user (if you set the env vars).

---

## 2. Where We Are in the Build

**Done (MVP-level):**

- Next.js 15 + TypeScript, Tailwind, Radix/HeadlessUI/Framer Motion.
- Auth: NextAuth with MongoDB adapter, GitHub + credentials.
- MongoDB: native client (`lib/db.ts`) + Mongoose layer (`lib/mongodb.ts`); `connectToDatabase()` lives in **`@/lib/mongodb`**, not in `@/lib/db`.
- Projects CRUD, ideation, analysis (Claude), project structure, build logs.
- Enhanced chat: GRIP identity, Anthropic Messages API, chat history (e.g. `chatHistory` collection).
- Terminal: XTerm.js, WebSocket/API; session concept exists (Mongoose model + service).
- Admin: tasks, builds, system state, project files.
- Notifications, analytics, dashboard, planning UI.

**Broken / Inconsistent (blocking polish and deploy):**

1. **Terminal page crash (client bundle)**  
   - **Cause:** `Manager.tsx` (client) imports `TerminalSessionService` → service imports `TerminalSession` (Mongoose model) and `mongoose`.  
   - Mongoose is not available in the client bundle (Next config externals/stub).  
   - At load, `TerminalSession.ts` runs and does `mongoose.models.TerminalSession` → `mongoose` is undefined → **"Cannot read properties of undefined (reading 'TerminalSession')"**.
   - **Fix:** Do **not** import server-only `TerminalSessionService` (or any Mongoose model) in client components. Manager should call **REST/API only** (e.g. `GET/POST /api/terminal/session`, etc.) and let API routes use `TerminalSessionService` and Mongoose.

2. **Wrong `connectToDatabase` import**  
   - **Cause:** `performanceMonitorService.ts` imports `connectToDatabase` from `@/lib/db`.  
   - `lib/db.ts` only exports `default clientPromise` and `dbConnect`. It does **not** export `connectToDatabase`.  
   - **Fix:** In `performanceMonitorService.ts`, change the import to `connectToDatabase` from `@/lib/mongodb` (or from wherever it’s actually exported, e.g. `lib/utils.ts` if that’s the canonical place). Align the rest of the codebase to a single source of truth for `connectToDatabase`.

3. **Next.js 15 `params` usage**  
   - **Cause:** Dynamic route handlers use `params.id` (or similar) synchronously.  
   - Next 15 expects `params` to be **awaited** in App Router.  
   - **Fix:** In each dynamic route (e.g. `api/projects/[id]`, `api/analysis/[id]`, `api/project-structure/[id]`, `api/projects/[id]/state`), do `const { id } = await params` (or equivalent) before use.

4. **Redirects vs real routes**  
   - **Cause:** `next.config.js` redirects `/projects/:id/enhanced-chat` and `/dashboard/projects/:id/chat` to `/dashboard/projects/:id`.  
   - You still have pages under `dashboard/projects/[id]/enhanced-chat/`. So “enhanced chat” may live at `/dashboard/projects/[id]/enhanced-chat` while redirects send old URLs to the project page. Confirm intended UX (e.g. “enhanced chat” as a tab or sub-route) and either keep one canonical URL or remove redirects that contradict it.

5. **Build/config shortcuts**  
   - **Cause:** `next.config.js`: `typescript.ignoreBuildErrors: true`, `eslint.ignoreDuringBuilds: true`.  
   - **Effect:** Build succeeds even with TS/ESLint errors. Acceptable temporarily; not acceptable for “top notch” and deploy. Plan to turn these off and fix errors.

---

## 3. Where We’re Heading (from PRD / .cursorrules)

- **Product:** G.R.I.P. = Guided Real-time Intellectual Partner.  
- **Goal:** Non-technical users go from ideation → project setup → customization → deployment with AI (Claude) and minimal coding.  
- **Phases in .cursorrules:** Phases 1–5+ for chat automation, planning, build integration, terminal integration, enhancements. Many steps still pending.  
- **Positioning:** “AI-driven Git repo analysis” + “project ideation and build from start to finish” with GRIP as the guide (not “Anthropic” or “Claude” in user-facing copy).

---

## 4. Gaps vs “Top Notch” and Deploy Readiness

**Critical (must fix before deploy):**

- Fix terminal page: **no Mongoose/server-only code in client**. Manager → API only; APIs → TerminalSessionService/Mongoose.
- Fix **all** `params` usage in dynamic API routes (await `params`).
- Unify **connectToDatabase**: one module (e.g. `@/lib/mongodb`), fix `performanceMonitorService` and any other wrong imports.
- **Secrets:** No real secrets in repo. `.env.local` must stay gitignored; production uses env vars (e.g. Vercel “env” from `vercel.json`). Rotate any keys that ever touched the repo.

**High (deploy-ready / top notch):**

- Remove or reduce **TypeScript/ESLint ignore** in Next config; fix reported errors.
- **Error boundaries:** Graceful handling for chat, terminal, and project pages so one failure doesn’t break the whole app.
- **Health/readiness:** e.g. `GET /api/ws/health` and a simple `GET /api/health` that checks DB (and optionally Anthropic) so orchestrators can verify deploy.
- **Logging:** Structured server-side logging (with request/correlation id) and minimal PII; no secrets in logs.
- **Rate limiting:** On auth and AI/chat endpoints to avoid abuse and cost spikes.

**Product (differentiation):**

- **GRIP personality:** All user-facing AI text (system prompts, chat UI copy) should say “G.R.I.P.” and “Guided Real-time Intellectual Partner,” not “Anthropic” or “Claude.”
- **End-to-end flow:** From “I want an app that does X” → project created → repo/structure → plan → build steps → clear success/failure. One clear path that works for at least one template/stack.
- **Observability:** Dashboard or admin view for “how many projects, builds, chat sessions, errors” and basic trends.
- **Docs:** README + “How to run” + “Environment variables” + “Deploy to Vercel” (or chosen platform). Link from repo.

---

## 5. Tech Stack Summary (for your memory)

| Layer | Technology |
|-------|------------|
| **App** | Next.js 15, React 18, TypeScript |
| **Auth** | NextAuth.js (GitHub OAuth + credentials), JWT, MongoDB adapter |
| **DB** | MongoDB Atlas; `lib/db.ts` (Mongo client), `lib/mongodb.ts` (Mongoose + connectToDatabase) |
| **AI** | Anthropic SDK (`@anthropic-ai/sdk`), Claude |
| **Real-time** | Socket.IO, WebSocket (optional) |
| **UI** | Tailwind, Radix, HeadlessUI, Framer Motion, Lucide |
| **Terminal** | XTerm.js, WebSocket/HTTP API |
| **Deploy** | Vercel-oriented (`vercel.json`); env vars for MongoDB, NextAuth, GitHub, Anthropic |

---

## 6. Ruthless Priorities (order of operations)

1. **Terminal:** Manager uses only fetch to `/api/terminal/*`; remove direct import of `TerminalSessionService` (and thus Mongoose/TerminalSession) from client. Verify terminal page loads and create/list session works.
2. **Params:** All dynamic route handlers await `params`; run app and hit each route; no more “params should be awaited” in logs.
3. **connectToDatabase:** Single source (e.g. `@/lib/mongodb`); fix `performanceMonitorService` and grep for any other `@/lib/db` + `connectToDatabase`.
4. **Secrets:** Confirm no `.env.local` in repo; document required env for deploy; rotate keys if needed.
5. **Build strictness:** Re-enable TypeScript and ESLint in Next config; fix blocking errors so CI/build is green.
6. **Health + error handling:** Add `/api/health`, error boundaries, and basic logging.
7. **GRIP voice:** Audit chat and AI prompts so every user-facing answer is clearly G.R.I.P., not “Anthropic.”
8. **One happy path:** One full flow (ideation → project → plan → build) working and documented.

---

## 7. What “Done” Looks Like

- **Run:** `npm run dev` → login → create/open project → enhanced chat and terminal both work.  
- **Build:** `npm run build` with no TS/ESLint ignores (or only a short, tracked list).  
- **Deploy:** Push to Vercel (or chosen host); set env vars; health check passes; no terminal or params errors in logs.  
- **Positioning:** App and docs describe G.R.I.P. as the product; Anthropic/Claude only in internal/technical docs.  
- **Next level:** One fully automated “ideation → deploy” path, observability, and rate limiting in place.

Use this as the single source of truth for “where we are, what we use, and what to fix first” so the team can execute in ruthless mode without losing context.
