# Preview & Ship: Plan for Getting the Project into Users’ Hands

This doc covers: **StackBlitz from project files only** (not cloned repo), **Export to GitHub** (create new repo), **Download project** (ZIP), **non-developer ease**, and **README at 100% completion**.

---

## Goals

1. **StackBlitz** – Open the **project’s file structure** (repo + generated projectFiles from DB) in StackBlitz, not the linked GitHub repo. One-click “Run in browser” for everyone, including non-devs.
2. **Export to GitHub** – Clear way to **create a new GitHub repo** for the project (already implemented as “Export”; expose it clearly on Preview and Overview).
3. **Download project** – **Export project** button that downloads a **ZIP** of the full project (same files as export). No GitHub or terminal required; huge for non-devs.
4. **Non-developers** – Preview is the most important section to get the app into their hands. Order and copy should prioritize: (1) Run in browser (StackBlitz), (2) Download project, (3) Export to GitHub, (4) Paste URL / Deploy.
5. **README at 100%** – When GRIP indicates 100% completion, include a **README.md** (project details + how to run) and suggest saving it so it appears in the project and in exports.

---

## 1. StackBlitz: Project Files Only

**Current behavior:** “Open in StackBlitz” uses the **linked or exported GitHub repo** URL (`stackblitz.com/github/owner/repo`). So it opens the clone, not necessarily the current GRIP project (repo + generated files in DB).

**Target behavior:** Send the **merged project file set** (repo files + projectFiles from DB; same as export) to StackBlitz via the **StackBlitz SDK** (`openProject({ files, template, title })`). No GitHub required to preview.

**Implementation:**

- **API:** `GET /api/projects/[id]/export-files` – Returns `{ files: Record<string, string> }` (path → content), built the same way as the export route (repo + projectFiles, projectFiles override same path). Auth required.
- **Client:** On Preview, “Open in StackBlitz”:
  1. Fetches `GET /api/projects/[id]/export-files`.
  2. Uses `@stackblitz/sdk` `openProject({ files, template, title }, { newWindow: true })`.
  3. Template: infer from `package.json` (e.g. nextjs, react, node) or default `node`.
- **Fallback:** If the project has an **exported repo URL**, we can still show “Open in StackBlitz (from GitHub)” as a secondary option that uses the repo URL. Primary is “Run in browser” from project files.

---

## 2. Export to GitHub (Create New Repo)

**Current behavior:** `POST /api/projects/[id]/export` **creates a new GitHub repo** and pushes the project files (repo + projectFiles). It already “creates a new repo”; the gap is **discoverability** and **wording**.

**Target behavior:**

- **Preview:** Prominent **“Export to GitHub”** button that creates a new repo (calls existing export API). Description: “Create a new GitHub repo with your project files and get a link.”
- **Overview:** Keep existing Export action; ensure the label says **“Export to GitHub (create new repo)”** or similar so users know it creates a repo.
- **After export:** Show the new repo URL and optional “Open in StackBlitz (from GitHub)” and “Deploy to Vercel” next steps.

**Implementation:** No new API. Add/update UI:

- Preview: “Export to GitHub” button → dialog/modal with optional repo name → `POST /api/projects/[id]/export` → show success + repo URL.
- Overview: Clarify copy that Export **creates** a new repo.

---

## 3. Download Project (ZIP)

**Target behavior:** **“Download project”** button that returns a **ZIP** of the full project (same file set as export: repo + projectFiles). Works for everyone; no GitHub or terminal.

**Implementation:**

- **API:** `GET /api/projects/[id]/download` – Build the same file map as export; stream a ZIP response (`Content-Disposition: attachment; filename="project-title.zip"`). Use a server-side ZIP library (e.g. `archiver`).
- **Preview:** “Download project” button → link to `GET /api/projects/[id]/download` (or fetch with auth and trigger download). Copy: “Download a ZIP of your project. No GitHub or terminal needed.”

---

## 4. Non-Developers: Preview Section Order and Copy

**Target behavior:** Preview is the place where **everyone** gets the app into their hands. Order and wording should make the **easiest path first** and avoid assuming dev skills.

**Suggested order on Preview:**

1. **Run in browser (StackBlitz)** – “One click. No install. Opens your project in StackBlitz and runs it in the browser.” Primary CTA. Uses project files only (see §1).
2. **Download project** – “Download a ZIP of your project. Open it on your computer or send it to a developer.” Secondary.
3. **Export to GitHub** – “Create a new GitHub repo with your project. Then you can deploy to Vercel or share the link.” For users who want a repo.
4. **Preview URL** – “Already have a live URL? Paste it here to view in the iframe.” (e.g. after deploy or local run.)
5. **Deployed / Live** – If `deployedUrl` exists, show “Open live site” and “Paste above to preview in iframe.”

**Copy for non-devs:**

- Short intro: “Get your app into your hands: run it in the browser, download it, or push it to GitHub and deploy.”
- Under “Run in browser”: “Best for everyone: no terminal, no GitHub. We send your project to StackBlitz and run it there.”
- Under “Download project”: “Get every file in one ZIP. You can open the folder, send it to a dev, or use it elsewhere.”

---

## 5. README at 100% Completion

**Target behavior:** When GRIP says the project is **100% complete** (or user says “we’re done”), GRIP should:

- Output a **README.md** in a **code block** (so it can be saved to the project).
- Content: **project title**, **short description**, **how to run** (e.g. `npm install`, `npm run dev`), and optional **project structure** or “Generated by G.R.I.P.”
- Prompt should tell GRIP to **suggest saving it as README.md** so it appears in Generated files and in exports/downloads.

**Implementation:**

- **Enhanced-chat system prompt:** Add a short block, e.g.  
  “When the project is complete (user or you indicate 100% or done), provide a **README.md** in a code block. Include: project title, description, how to run (npm install, npm run dev), and optional structure. Tell the user they can save it as README.md to the project so it appears in exports and downloads.”
- Optionally: **Generate README** action (e.g. from Overview or Preview) that calls AI or a template to create README content and save to projectFiles as `README.md`. Can be a follow-up.

---

## 6. Summary Checklist

| Item | Status | Notes |
|------|--------|--------|
| StackBlitz from project files only | To do | API export-files + client @stackblitz/sdk |
| Export to GitHub (create new repo) | Exists | Expose clearly on Preview + Overview |
| Download project (ZIP) | To do | GET download + archiver (or equivalent) |
| Preview order/copy for non-devs | To do | Run in browser → Download → Export → URL |
| README at 100% in chat | To do | Prompt addition + suggest save as README.md |

---

## 7. File / Route Summary

- **New:** `GET /api/projects/[id]/export-files` – JSON `{ files: Record<string, string> }` for StackBlitz.
- **New:** `GET /api/projects/[id]/download` – ZIP stream of project files.
- **Update:** Preview page – StackBlitz from files, “Export to GitHub” button, “Download project” button, reorder and non-dev copy.
- **Update:** Enhanced-chat system prompt – README at 100% completion.
- **Optional:** “Generate README” action that creates and saves README.md to project.
