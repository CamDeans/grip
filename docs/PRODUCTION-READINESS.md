# GRIP Production Readiness

## Identity

- **G.R.I.P.** (Guided Real-time Intelligence Partner) is the product identity. User-facing copy uses "G.R.I.P." or "GRIP AI"; no references to Claude or Anthropic in UI, errors, or placeholders.
- System prompts in `/api/enhanced-chat`, `/api/ai/chat`, and `/api/chat/completion` define the assistant as G.R.I.P., not Claude/Anthropic.
- Chat UI shows "GRIP is thinking…" and surfaces errors as "G.R.I.P. AI is temporarily unavailable" (or the API message) when the AI backend is down or misconfigured.

## First-time user flow

1. **Home (/**) — Unauthenticated users see the landing page: value prop, "Get started free" and "Sign in".
2. **Register (/register)** — "Create your account" + short tagline; uses G.R.I.P. branding.
3. **Login (/login)** — "Sign in to your account" + "Your AI development partner for turning ideas into runnable products."
4. **Dashboard (/dashboard)** — "Welcome to your G.R.I.P. AI-assisted development workspace"; "New Project" CTA.
5. **New Project → Ideation → Planning → Enhanced Chat / Repo** — User can create a project, add ideation, link a repo in settings, open Repo Explorer, and use enhanced chat.

## Graceful degradation

- **Missing `ANTHROPIC_API_KEY`**  
  - `/api/enhanced-chat` returns **503** with message: *"G.R.I.P. AI is not configured. Please contact your administrator or check server configuration."*  
  - Chat UI shows this message (or "G.R.I.P. AI is temporarily unavailable") so users never see raw provider names.
- **AI init or API failure**  
  - Enhanced-chat returns **503** with a short, user-friendly message; UI shows it via the provider’s error handling.
- **No repo linked**  
  - Repo Explorer shows: *"Link a GitHub repository in project settings, then return here."*  
  - Enhanced chat uses project, ideation, and repo context; a GitHub repo is required when creating a project so GRIP can analyze it and use its structure and patterns.

## Critical path (auth → project → chat/repo)

- **Auth:** Register and Login use NextAuth with credentials; session used for dashboard and project APIs.
- **Projects:** Create project (name, description, required repo, ideation) → open project. All tabs (Overview, Settings, Repo, Develop, Preview) are always visible.
- **Repo:** Repo tab and Repo Explorer use the linked repo; Settings tab always visible for ideation and repo link.
- **Chat:** Enhanced chat is available per project; uses project + repo context; code applies and build runs automatically; shows clear errors when AI is unavailable.

## Environment and deployment

- See **`docs/VERCEL-DEPLOYMENT-ENV.md`** for all required env vars.
- **Required:** `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` or `GITHUB_ACCESS_TOKEN`, **`VERCEL_TOKEN`** (for Deploy to Vercel).
- **Health:** `/api/health` for DB; `/api/health/anthropic` for AI connectivity (admin/diagnostic).

## Checklist before release

- [ ] `NEXTAUTH_URL` set for production (e.g. `https://your-domain.com`).
- [ ] `MONGODB_URI` valid and reachable (e.g. Atlas with network access and encoded special chars).
- [ ] `ANTHROPIC_API_KEY` set (G.R.I.P. chat).
- [ ] `GITHUB_TOKEN` or `GITHUB_ACCESS_TOKEN` set (Export to GitHub, repo clone).
- [ ] **`VERCEL_TOKEN`** set (Deploy to Vercel; add to `.env.local` and Vercel project env).
- [ ] Landing, login, and register show G.R.I.P. branding and no third-party AI names.
- [ ] New user can complete: Register → Login → New Project → Link repo → Repo Explorer / Enhanced Chat / Preview / Export / Deploy without unclear errors.

---

## When to test before deployment

**Test locally only after:**

1. **`VERCEL_TOKEN`** is set in `.env.local` (get it from [Vercel → Account → Tokens](https://vercel.com/account/tokens)). Do not deploy to Vercel until this is set and you have run the test below.
2. All other required env vars are set (MongoDB, NextAuth, Anthropic, GitHub); no changes to your existing GitHub vars.

**Run this single pre-deploy test:**

1. `npm run build` — must succeed.
2. `npm run start` (or `npm run dev`).
3. Sign in → Dashboard → open a project that has a linked GitHub repo.
4. **Overview:** Click **Export to my GitHub** → expect a new repo URL or a clear error (e.g. token). Click **Deploy to Vercel** → expect "Deployment started" or a clear error (e.g. missing `VERCEL_TOKEN`).
5. **Repo tab:** Open Repo Explorer, search, open a file, Edit → Save. **Preview tab:** Paste a URL or use Open in StackBlitz. **Chat:** Send one message and confirm G.R.I.P. replies or shows the configured error.

If all of the above pass, you are ready to deploy (e.g. push to Vercel). After deployment, set the same env vars (including `VERCEL_TOKEN`) in the Vercel project environment.
