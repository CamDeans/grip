# GRIP — Page and Flow Audit

Deep analysis of every user-facing page: contents, buttons, links, data, and flow so the user receives the full experience and nothing is omitted.

---

## 1. Entry and auth

| Route | Purpose | Data | Buttons / links | Flow / omissions |
|-------|---------|------|-----------------|-----------------|
| `/` | Landing or redirect | Session | Login, Register | If session → redirect `/dashboard`. Else `<LandingPage>` with Login, Register. |
| `/login` | Sign-in (NextAuth) | — | Sign in, Register, Admin login | Canonical login; `/auth/signin` redirects here. |
| `/register` | Sign-up | — | Register, link to Login | On success → `/login?registered=true`. |
| `/auth/signin` | Redirect only | — | — | Redirects to `/login`. |
| `/admin/login` | Admin sign-in | — | — | Redirects to `/login?callbackUrl=.../admin`. |

**Auth consistency:** Sign-out should send users to `/login` (matches auth config and Dashboard Settings). DashboardLayout was using `/auth/signin`; aligned to `/login`.

---

## 2. Dashboard shell

| Route | Purpose | Data | Nav / links | Flow / omissions |
|-------|---------|------|--------------|-------------------|
| `/dashboard` | Main dashboard | `/api/dashboard/stats`, `/api/projects?limit=3&sort=recent` | New Project, stat cards (Active / Completed / Builds / Terminal), Recent Projects, Quick actions (Projects, Terminal, Analytics, Docs) | Stat cards link to Projects, Analytics, Terminal. Recent rows → project overview. Empty state → New Project. Full experience. |
| `/dashboard/projects` | Projects list | `/api/projects` | New Project, tabs (All / Active / Completed / Archived), search, sort | Tab syncs with `?status=`. Cards → `/dashboard/projects/:id`. Empty → New Project. |
| `/dashboard/projects/new` | New project | — | Back to Projects, Next/Back (details → context), Create | Two steps: details + ideation. On create → `/dashboard/projects/:id`. Cancel → Projects. |
| `/dashboard/projects/new/details` | Optional details step | — | — | Redirects to `/dashboard/projects/new`. |
| `/dashboard/terminal` | Terminal | Project context | — | Uses `?projectId=` when opened from project. |
| `/dashboard/analytics` | Analytics | `/api/analytics` | Timeframe, project “View” links | Projects list uses `p.id` (API returns `id: _id`) → `/dashboard/projects/:id`. Correct. |
| `/dashboard/settings` | User settings | User + GitHub | Sign out → `/login` | Full. |
| `/dashboard/examples` | Examples | — | CTA → New Project | Full. |
| `/dashboard/chat` | Legacy chat | — | — | Still present; main flow is project Develop. |

**Footer (DashboardLayout):** Docs, API, Support, Contact, Privacy, Terms, Admin. All valid.

---

## 3. Project scope (per project)

**Layout:** `/dashboard/projects/[id]/layout.tsx`  
- Loads project via `/api/projects/[id]`.  
- Tabs: Overview, Repo, Plan, Develop, Preview, Settings.  
- All tab links use correct `/dashboard/projects/:id/...` paths.

| Tab route | Purpose | Data | Buttons / links | Flow / omissions |
|-----------|---------|------|-----------------|------------------|
| `/dashboard/projects/[id]` | Overview | `/api/projects/[id]`, project files | Step links (Ideate, Repo, Plan, Develop, Preview & Ship), Generated files “View”, Repo / Preview / Export / Deploy, status (Active / Completed / Archived) | Step hrefs use `{id}` replaced by `projectId`. `#see-it-run` and `#generated-files` exist. Export/Deploy disabled when no repo/files as designed. Full. |
| `/dashboard/projects/[id]/repo` | Repo explorer | `/api/projects/[id]/repo/tree` or project-tree | New folder, Summarize, Copy/Paste, file actions | View modes: repo vs project. Empty states point to Settings or Develop. Full. |
| `/dashboard/projects/[id]/planning` | Plan | `/api/projects/[id]/plan`, generation APIs | Generate plan, Generate files, etc. | Uses `<PlanGenerator>`. Redirect if no session or no projectId. Full. |
| `/dashboard/projects/[id]/enhanced-chat` | Develop (GRIP chat) | `/api/projects/[id]`, chat APIs | Overview / Develop / Settings links, send, run, save | Task param and StackBlitz errors query supported. Full. |
| `/dashboard/projects/[id]/preview` | Preview & ship | `/api/projects/[id]`, export-files, download, export, deploy, preflight, run-errors | Run in StackBlitz, Download, Export to GitHub, Deploy, “I saw errors” → Develop with errors submitted | Links to Develop, Settings, Docs. Preflight errors block actions with messages. Full. |
| `/dashboard/projects/[id]/settings` | Project settings | `/api/projects/[id]` | Save, Delete, Back to Projects, GitHub token link | Delete → `/dashboard/projects`. Full. |

---

## 4. Legacy / redirect-only project routes

| Route | Behavior |
|-------|----------|
| `/projects/[id]` | Client redirect → `/dashboard/projects/[id]`. |
| `/projects/[id]/enhanced-chat` | next.config redirect → `/dashboard/projects/[id]`. |
| `/projects/[id]/chat` | next.config redirect → `/dashboard/projects/[id]`. |
| `/projects/[id]/workflow` | Redirect → `/dashboard/projects/[id]/planning`. |
| `/projects/[id]/code-generator` | Redirect → `/dashboard/projects/[id]/enhanced-chat`. |
| `/projects/[id]/test-db` | Redirect → `/dashboard/projects/[id]`. |
| `/dashboard/projects/[id]/chat` | next.config redirect → `/dashboard/projects/[id]`. |

No content omitted; users land on the correct dashboard project pages.

---

## 5. Docs and support

| Route | Purpose | Links | Flow / omissions |
|-------|---------|-------|------------------|
| `/docs` | Docs index | Sections, Support, GitHub issues, Examples, Chat | All internal and external links valid. |
| `/docs/[...slug]` | Doc article | Breadcrumb, index, API ref | Full. |
| `/docs/api` | API reference | — | Full. |
| `/support` | Support | Dashboard, tickets | Full. |
| `/contact` | Contact | Support, Docs, API, GitHub, Privacy, Terms | Session-aware nav. Full. |
| `/privacy`, `/terms` | Legal | Back to app / login | Full. |

---

## 6. Fixes applied (so nothing is omitted)

1. **Sign-out destination**  
   DashboardLayout was sending users to `/auth/signin` after sign-out. Updated to `router.push('/login')` so it matches auth config and Dashboard Settings and users always see the same login page.

2. **CodeGenerator “View file” link**  
   Link was `/projects/${projectId}/files/${file.fileId}` (no such route). Updated to `/dashboard/projects/${projectId}#generated-files` so “View file” opens the project overview and scrolls to the Generated files section where they can view content.

---

## 7. Data flow summary

- **Dashboard:** Stats and recent projects → project list and overview.  
- **Projects list:** Filter/sort and project cards → project overview.  
- **New project:** Details + ideation → create → project overview.  
- **Project overview:** Steps, generated files, and actions → Repo, Plan, Develop, Preview, Settings.  
- **Develop:** Chat, run, save, StackBlitz errors → project files and run-errors API.  
- **Preview:** Export files, StackBlitz, Download, Export, Deploy, preflight, run-errors → full ship flow.  
- **Analytics:** Projects list “View” uses `p.id` (from API `id: _id`) → correct project overview.

---

## 8. Checklist (full experience, nothing omitted)

- [x] Landing and auth: Login, Register, redirects, sign-out to `/login`.  
- [x] Dashboard: Stats, recent projects, quick actions, links to Projects / Analytics / Terminal.  
- [x] Projects list: Tabs, search, sort, cards → project overview.  
- [x] New project: Two-step form → project overview.  
- [x] Project layout: All six tabs present and linked.  
- [x] Overview: Step links (with `{id}` replaced), generated files, See it run, Export/Deploy.  
- [x] Repo: Tree, view mode, folder/file actions, empty states.  
- [x] Plan: Plan + file generation, redirect when unauthorized.  
- [x] Develop: Chat, run, save, StackBlitz errors query.  
- [x] Preview: StackBlitz, Download, Export, Deploy, error submission to Develop.  
- [x] Settings: Save, Delete, GitHub link.  
- [x] Analytics: Project “View” links use correct id.  
- [x] CodeGenerator: “View file” goes to project overview #generated-files.  
- [x] Docs, Support, Contact, Privacy, Terms: Links and flows valid.  
- [x] Legacy `/projects/*` and `/dashboard/projects/[id]/chat`: Redirects to correct dashboard pages.
