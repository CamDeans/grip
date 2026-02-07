# User flow and how the build meets your ideation

We did **not** change the core flow. We added **Preview**, **Export to GitHub**, **Deploy to Vercel**, and **Repo edit/search/summarize** on top of the existing flow. Chat, planning, and ideation work as before; G.R.I.P. chat always uses your current project and ideation.

---

## 1. Create project

- **New Project** → **Details** (title, description) → **Context** (ideation: goals, target audience, key features, technical requirements).
- **Repository** is optional at creation; you can link it later in **Settings**.
- On submit: project is created; if a repo was set, analysis runs in the background. You land on the **project Overview**.

---

## 2. Full flow (unchanged + what we added)

| Step | Where | What happens |
|------|--------|----------------|
| **Ideate** | Create project + **Settings** | Ideation is saved with the project. You can **update ideation anytime** in **Settings** (goals, audience, features, technical requirements). You can also link or change the GitHub repo there. |
| **Plan & design** | **Planning** tab | **Generate Plan** uses project + ideation (and repo if linked) to produce a development plan (structure, phases, tasks). **Generate Files** creates files from that plan. You can **regenerate** after changing ideation or repo. |
| **Develop** | **Chat** tab + **Repo** tab | **Chat**: G.R.I.P. has full context — project title/description, **ideation** (goals, audience, features, technical requirements), repo structure, and (if you ran it) per-file summaries. You tell it what to build; it suggests code and steps. **Repo**: Browse/search files, **edit and save** files, **Summarize for G.R.I.P.** to enrich chat context. |
| **Test & refine** | **Preview** tab + **Chat** + **Repo** | **Preview**: Paste a live app URL to view in-app, or **Open in StackBlitz** to run the repo in the browser. **Chat** and **Repo** let you keep changing code and ideation until the app matches your vision. |
| **Ship** | **Overview** | **Export to my GitHub** creates a new repo with your project files. **Deploy to Vercel** deploys from that repo (or the linked repo). **Mark ready to export** / status show where you are in the completion flow. |

---

## 3. How you keep adding input so the build meets your full ideation

- **Settings**  
  Update **ideation** (goals, target audience, key features, technical requirements) and **repo** (link or change) anytime. Everything that uses the project (Planning, Chat, Repo) uses this latest data.

- **Planning**  
  **Generate Plan** / **Generate Files** use current project + ideation + repo. After you change ideation or repo, run **Generate Plan** again (and **Generate Files** if you want new files from the new plan).

- **Chat**  
  G.R.I.P. is always fed the **current** project and ideation (and repo context and summaries when available). Say what you want next (“add login”, “refactor X”, “match the technical requirements for Y”); it suggests code and steps. You implement in Repo or by following its instructions.

- **Repo**  
  **Edit** files and **Save** so the codebase matches your intent. **Search** to find what to change. **Summarize for G.R.I.P.** so chat has better file-level context for later messages.

- **Preview**  
  Use a live URL or StackBlitz to **see** the app. If it doesn’t match your ideation, go back to Settings (ideation), Planning (plan/tasks), Chat (next steps), or Repo (direct edits) and iterate.

- **Export / Deploy**  
  When the build matches your ideation, use **Export to my GitHub** then **Deploy to Vercel** from the Overview. No flow change: same ideation → plan → chat → repo loop until you’re satisfied, then ship.

---

## 4. Summary

- **Flow**: Create project (ideation ± repo) → **Planning** (plan + optional file generation) → **Chat** (implementation guidance with full ideation context) + **Repo** (view/edit/search/summarize) → **Preview** (see it run) → **Export / Deploy** when ready.
- **We added**: Preview tab, Export to GitHub, Deploy to Vercel, Repo edit/search/summarize, completion status. We did **not** replace the existing ideation → planning → chat → build flow.
- **To make the build meet your full ideation**: Update **Settings** (ideation + repo), regenerate **Planning** when needed, use **Chat** for next steps, edit in **Repo**, check **Preview**, and repeat until it matches; then Export and Deploy.
