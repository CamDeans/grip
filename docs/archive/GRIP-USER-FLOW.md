# GRIP User Flow — Restructured for "Launch to the Moon"

## Vision in One Line

**Reference any repo → analyze patterns → generate new code with GRIP → experiment safely in sandbox → run it here → deploy it.** All in one place, one clear path. Clean-room code generation—reference repos for patterns, generate new code.

---

## The GRIP Journey (Linear Flow)

```
Dashboard → New Project → [Project Home] → Repo (Reference) → Plan → Develop (Chat) → Sandbox (Optional) → Preview → Export/Deploy
```

### 1. **Dashboard** (`/dashboard`)
- Single entry: "New Project" + list of recent projects.
- Click a project → Project Home (overview).

### 2. **New Project** (`/dashboard/projects/new`)
- One flow: **Name + description** → **Select GitHub repo** (required; use Generate Keywords and Search) → **Ideation** (goals, audience, features, tech). A repo is required so GRIP can analyze it and use its structure and patterns.
- On create → redirect to **Project Home** for that project. Repo analysis and plan generation run automatically.

### 3. **Project Home — Overview** (`/dashboard/projects/[id]`)
- **One clear purpose**: "Here’s your project; here’s your next step."
- Show: title, repo link, ideation summary, **completion status** (Draft → Ready to export → Exported / Deployed).
- **Single CTA**: "Continue with GRIP" or "Open Chat" → goes to **Develop (Chat)**.
- **Step strip** (not 6 equal tabs):  
  **Ideate** (done at creation) → **Repo** → **Plan** → **Develop** → **Preview** → **Ship** (Export/Deploy).  
  Current step highlighted; others clickable.

### 4. **Repo** (`/dashboard/projects/[id]/repo`)
- "Make this repo yours."
- Full file tree (from clone + analysis), file viewer, search.
- Optional: "Summarize this file" via context for Chat later.

### 5. **Plan** (`/dashboard/projects/[id]/planning`)
- "Structure your work."
- Generate/view plan from ideation + repo; tasks, milestones, dependencies.
- One primary action: "Generate plan" or "Refresh plan."

### 6. **Develop — Chat** (`/dashboard/projects/[id]/enhanced-chat`)
- "Build with GRIP."
- Single chat experience (no "Standard" vs "Enhanced" in nav): always enhanced, project context, repo + analysis.
- Actions: ask questions, request code changes, run commands (terminal bridge), see task progress.
- GRIP generates new code following repository patterns—clean-room implementation, never copied.
- **Full automation**: Code from chat is applied to the project automatically; the build runs automatically after applies. No manual save or run steps. Progress (phases and steps) syncs on the Overview tab.
- Users can also manually save code blocks if they prefer to review first.

### 6b. **Sandbox Playground** (`/dashboard/projects/[id]/sandbox-chat`)
- "Experiment safely."
- Create isolated sandbox experiments from main project.
- Test risky refactors, architecture changes, or new dependencies.
- All sandbox code is clean-room generated (reference only).
- When successful, promote changes back to main project with one click.

### 7. **Preview** (`/dashboard/projects/[id]/preview`)
- "See it run."
- URL input or "Open in StackBlitz" (later: embed or Vercel preview).
- One goal: user sees the app running.

### 8. **Ship — Export / Deploy** (from Overview or dedicated step)
- **Export to my GitHub**: create repo, push project files.
- **Deploy to Vercel**: one-click from linked repo.
- Status: Draft → Ready to export → Exported → Deployed.

### 9. **Settings** (`/dashboard/projects/[id]/settings`)
- Project-level settings only (repo link, name, description, ideation edit).
- Kept as last tab so the main flow stays: Repo → Plan → Develop → Preview → Ship.

---

## Tab Order (Project Layout)

All tabs are always visible: Overview, Settings, Repo, Develop, Preview.

| Order | Tab       | Route                          | Purpose                    |
|-------|-----------|---------------------------------|----------------------------|
| 1     | Overview  | `/dashboard/projects/[id]`     | Home, status, next step, sandbox experiments |
| 2     | Settings  | `.../settings`                 | Project config, ideation, repo link           |
| 3     | Repo      | `.../repo`                     | Reference & analyze patterns                  |
| 4     | Develop   | `.../enhanced-chat`            | Chat with GRIP, build (main); code applies and build runs automatically |
| 4b    | Sandbox   | `.../sandbox-chat`             | Experiment safely (sandbox projects)         |
| 5     | Preview   | `.../preview`                  | See it run                                   |

"Ship" (Export/Deploy) lives on **Overview** as primary actions, not a separate tab.

---

## What We Remove or Consolidate

1. **Duplicate routes**
   - **Use only** `/dashboard/projects/[id]/...` for app flow.
   - **Redirect or remove** `/projects/[id]/*` (e.g. redirect to dashboard equivalent so old links work).

2. **Chat split**
   - No "Standard" vs "Enhanced" in UI. One project chat: **Develop** tab = enhanced chat.
   - Remove or repurpose `/dashboard/projects/[id]/chat` if it exists; link everything to `enhanced-chat`.

3. **Banner clutter**
   - Replace long "Enhanced Chat Interface" banner with one short line:  
     "GRIP is your AI partner for this project. Start in **Develop** to build, or explore **Repo** and **Plan** first."

4. **Overview page**
   - Fewer cards; one "Next step" or "Continue with GRIP" that goes to Develop (or Repo if no clone yet).
   - "See it run & ship it" stays as the main Export/Deploy/Preview entry point.

---

## Success Criteria

- User can go **Dashboard → New Project → Overview → Develop** in four clicks.
- Every project page has a **single obvious next action**.
- Tabs read as a **journey**: Overview → Repo → Plan → Develop → Preview → Settings; Ship on Overview.
- No duplicate project routes; one canonical path: `/dashboard/projects/[id]/...`.
- GRIP identity and mission are clear from the flow: *make a repo yours, run it, ship it*.

---

## Implementation Checklist

- [ ] Reorder project tabs: Overview, Repo, Plan, Develop, Preview, Settings.
- [ ] Rename "Chat" tab to "Develop" and point it to `enhanced-chat` only.
- [ ] Replace project layout banner with one short GRIP line.
- [ ] Fix all internal links: use `/dashboard/projects/[id]/...` (fix EnhancedChatInterface and any `/projects/` links).
- [ ] Add redirects from `/projects/[id]/*` to `/dashboard/projects/[id]/*`.
- [ ] Simplify Overview: one primary CTA, step strip, "See it run & ship it" block.
- [ ] (Optional) Add a "Current step" indicator on Overview from completion status or last activity.
