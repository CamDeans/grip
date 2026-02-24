# Chat interface enhancement & testing roadmap

This doc outlines how to bring the **chat interface and development workflow** to a top-notch level and how to **complete testing and integration** for a production-ready app.

---

## 1. Chat interface & development workflow (top priority)

**Goal:** The chat UI should be the best-in-class surface for development support: ideation, planning, code generation, and terminal/context integration.

### Current state

- Enhanced chat with GRIP identity, Anthropic Messages API, project context, analysis/code tabs.
- Context panel (project, analysis, code), task progress indicator, action buttons.
- Links to standard chat, enhanced chat, settings.

### Enhancements to complete (think big)

1. **Development workflow in the UI**
   - **Structured workflow steps in chat:** Show current phase (Ideate → Plan → Build → etc.) and allow "Jump to step" from chat.
   - **One-click actions from messages:** e.g. "Create file", "Run command", "Open in Terminal" as buttons on AI suggestions.
   - **Inline code blocks:** Run/copy/apply actions on code snippets; optional "Insert at cursor" for an open file (when file context exists).
   - **Project context always visible:** Collapsible sidebar with project summary, current step, and recent files (no dead "Context disabled" without a way to enable).

2. **Chat UX**
   - **Streaming responses** with typing indicator and markdown/code rendering.
   - **Message grouping** by turn (user + assistant pair) and clear separation.
   - **Error and retry:** Clear error messages and "Retry" for failed requests.
   - **Persistence:** Chat history loads correctly when returning to the project; no blank state when history exists.

3. **Context and tools**
   - **File/code context:** "Use these files" selector so the user can pin files for the next message.
   - **Terminal integration:** Optional "Include last terminal output" or "Run this in terminal" from chat.
   - **Build/run status:** Show last build result or run command in the chat context bar when relevant.

4. **Admin dashboard alignment**
   - If the admin dashboard lists "Chat interface enhancement to support development workflow" as incomplete, the above items are the checklist. Mark complete when: workflow steps are visible and actionable from chat, one-click actions work, context is reliable, and errors/retries are handled.

### Where to implement

- **Enhanced chat UI:** `src/components/chat/EnhancedChatInterface.tsx`, `ChatArea.tsx`, `FormattedMessage.tsx`, `ActionButtons.tsx`.
- **Context and workflow:** `ProjectContextDisplay.tsx`, `TaskProgressIndicator.tsx`, enhanced-chat provider and API routes under `src/app/api/enhanced-chat`, `src/app/api/chat`, `src/app/api/projects/[id]/context`.
- **New actions:** API routes for "create file", "run command", and wiring from chat message actions to those APIs.

---

## 2. Testing and integration (complete system)

**Goal:** Test the complete system and ensure smooth integration before production.

### What to test

1. **Critical paths (E2E or integration)**
   - **Auth:** Sign in (credentials + GitHub), sign out, protected routes redirect to login.
   - **Projects:** Create project → ideate → plan → view structure; open project from dashboard.
   - **Chat:** Send message in enhanced chat, receive response; context panel shows project/analysis when enabled.
   - **Terminal:** Open terminal page, create session, run a simple command (if WebSocket/server available).
   - **Admin:** Admin-only routes redirect when not admin; tasks/builds pages load.

2. **API integration**
   - **Health:** `GET /api/health` returns 200 when DB is reachable.
   - **Projects:** `GET/POST /api/projects`, `GET /api/projects/[id]`.
   - **Chat:** `POST /api/enhanced-chat` or equivalent with projectId and message.
   - **No client-side server imports:** All pages that use terminal, chat, or project data use fetch/API only (no Mongoose/models on client).

3. **Build and deploy**
   - **Build:** `npm run build` passes on a clean clone (e.g. in CI). No `Module not found` for `@/components/ui/button` or `@/components/ui/Card` (case-sensitive).
   - **Env:** Required env vars documented; Vercel (or other host) has all required variables; optional WebSocket vars set or disabled.

### How to run

- **Unit/component:** `npm test` or `npm run test:coverage`.
- **Lint:** `npm run lint`.
- **Build:** `npm run build` or `npm run build:check` (lint + build).
- **Pre-push:** Run `npm run build:check` before pushing; CI (e.g. GitHub Actions) runs the same on push/PR.

### Definition of "smooth integration"

- No runtime errors on main user flows (auth, project list, project detail, chat, terminal page).
- Build passes in CI and on Vercel.
- All buttons and links either go to real pages or to placeholders (Privacy, Terms, Contact, Docs sections, Examples) with no 404s on primary navigation.

---

## 3. Links and pages (production-ready app)

**Done in this pass:**

- **Footer:** Privacy, Terms, Contact are `Link` components to `/privacy`, `/terms`, `/contact`; those pages exist.
- **Auth:** `/auth/signin` redirects to `/login`.
- **Docs:** `/docs` and `/docs/api` exist; `/docs/getting-started`, `/docs/features/*`, `/docs/integrations/*`, `/docs/advanced/*`, `/docs/best-practices` are handled by a catch-all doc page so links don’t 404.
- **Dashboard:** `/dashboard/examples` exists (placeholder). `/dashboard/chat` already existed.

**Optional next steps:**

- Add real content to doc section pages (getting-started, features, etc.) or link from the catch-all to the main docs index.
- Add a simple 404 page (`src/app/not-found.tsx`) that links back to dashboard/docs.

---

## 4. Build and deploy checklist

- [ ] Run `npm run build:check` before pushing.
- [ ] Fix any `Module not found` or case-sensitivity issues (use `@/components/ui` or the re-export files `button.tsx` / `Card.tsx`).
- [ ] Ensure all env vars for Vercel are set (see `docs/VERCEL-DEPLOYMENT-ENV.md`).
- [ ] In GitHub OAuth App, set Authorization callback URL to `https://<your-vercel-domain>/api/auth/callback/github`.
- [ ] Optionally set `NEXT_PUBLIC_DISABLE_WEBSOCKETS=true` on Vercel if you’re not running a separate WebSocket server.
