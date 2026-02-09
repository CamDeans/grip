# Step-by-Step Testing Guide: Terminal, Chat & DB Installs

Use this guide to test what we've built: scroll-to-last-message, in-app terminal with project link, DB-backed installs (npm/yarn/pnpm), and Vercel-aware behavior.

---

## Prerequisites

1. **GRIP running locally**
   ```bash
   cd /path/to/GRIP
   npm install
   npm run dev
   ```
   Leave this running. Use a browser at `http://localhost:3000` (or your dev URL).

2. **Logged in** – Sign in so you can access Dashboard and projects.

3. **One project** – You need at least one project (create one from Dashboard → New Project if needed). Note its **project ID** from the URL when you open it (e.g. `http://localhost:3000/dashboard/projects/674abc123...` → ID is `674abc123...`).

---

## Part 1: Chat – Scroll to Last Message

**Goal:** When you leave the chat and come back, the view shows the **last message** (bottom of thread), not the top.

### Steps

1. **Open enhanced chat for a project**
   - Dashboard → **Projects** → click a project.
   - Click **“Continue with GRIP — Develop”** (or open **Develop** tab / `.../enhanced-chat`).

2. **Create enough messages so you can scroll**
   - Send 2–3 messages (e.g. “What’s in this project?”, “List the main files”).
   - Wait for replies so the thread is longer than the view.

3. **Scroll up** so you’re looking at older messages (top of thread).

4. **Leave the chat**
   - Go to another page (e.g. project overview or Dashboard).

5. **Return to the same chat**
   - Open the same project → **Develop** (or `.../enhanced-chat`) again.

6. **Check**
   - The view should **scroll to the bottom** and show the **last GRIP response**.
   - If it doesn’t, the scroll-to-last effect may be broken.

---

## Part 2: Chat – Shell Blocks & “Run in App Terminal”

**Goal:** Shell commands from GRIP show “Run in app terminal” and copy gives a hint.

### Steps

1. **Stay in enhanced chat** for a project.

2. **Ask for an install command**
   - Send: **“Give me the exact npm install command to add lodash to this project.”**
   - Wait for a reply.

3. **Check the response**
   - There should be a **shell/code block** (e.g. `` ```bash `` or `` ```shell ``) with something like `npm install lodash`.
   - Above or beside the block you should see **“Run in app terminal”** (or similar).
   - Click **Copy** on that block → a toast should say something like **“Run in app terminal”** / “Paste in the GRIP terminal (Dashboard → Terminal).”

4. **Optional – Context panel**
   - Open the **Terminal** tab in the context panel (right side).
   - Text should say to run commands in the **in-app terminal** (Dashboard → Terminal), not “open a terminal on your machine.”

---

## Part 3: In-App Terminal – Project-Scoped & Project Name

**Goal:** “Open terminal for this project” opens a terminal that shows the **project name** and is tied to that project.

### Steps

1. **Open project overview**
   - Dashboard → **Projects** → click a project.

2. **Open terminal for this project**
   - Click **“Open terminal for this project”**.
   - You should land on **Dashboard → Terminal** with URL like:
     `http://localhost:3000/dashboard/terminal?projectId=YOUR_PROJECT_ID`

3. **Check terminal UI**
   - **Header:** Title should be **“G.R.I.P. Terminal — [Your Project Name]”** (not just “Terminal 9bf6414b”).
   - **Badge:** “Project terminal” should appear.
   - **Welcome box:** Should say **“G.R.I.P. Terminal v1.0 — Project: [Your Project Name]”** and the paragraph about **“Installs are saved to the project (like file saves)”**.

4. **If you see “No project folder yet”**
   - That’s expected if you haven’t run Setup project. The DB installs (next part) still work.

---

## Part 4: DB-Backed Installs in the GRIP Terminal

**Goal:** `npm install <pkg>` and `yarn add <pkg>` in the project terminal **update package.json in the DB** (projectFiles), like file saves. No real `node_modules` on disk in the app.

### Steps

1. **Use the project terminal** from Part 3 (URL has `?projectId=...`).
   - If you closed it: Project overview → **“Open terminal for this project”** again.

2. **Run install (add one package)**
   - In the terminal input, type:
     ```bash
     npm install lodash
     ```
   - Press Enter.

3. **Check output**
   - You should see something like:
     - `added 1 package, and audited X packages in 1s`
     - `found 0 vulnerabilities`
   - No error about “command not found” or “projectPath required.”

4. **Run install (add dev dependency)**
   - Type:
     ```bash
     npm install --save-dev typescript
     ```
   - Press Enter.
   - You should see similar “added 1 package…” style output.

5. **Optional – yarn / pnpm**
   - If your project uses them, try:
     ```bash
     yarn add date-fns
     ```
   - Or:
     ```bash
     pnpm add axios
     ```
   - Same idea: success message, no filesystem error.

6. **Verify package.json in the project**
   - Go to **Project overview** → **Generated files** (or **Repo** / **Files** depending on your UI).
   - Find **package.json** (root).
   - Open it: it should list **lodash**, **typescript** (in devDependencies), and any other packages you added.
   - This file lives in the **DB** (projectFiles), not on disk.

7. **Run plain `npm install` (no package name)**
   - Back in the project terminal, run:
     ```bash
     npm install
     ```
   - You should see something like:
     - `Installing dependencies...`
     - `up to date, audited X packages in 1s`
     - `found 0 vulnerabilities`
   - So “install” is treated as “sync / list deps from package.json in DB.”

---

## Part 5: Full Sequence (Copy-Paste Flow)

**Single flow you can do start-to-finish.**

### 1. Start app and log in

```bash
cd /path/to/GRIP
npm run dev
```

- Open `http://localhost:3000`, sign in.

### 2. Open a project

- Dashboard → **Projects** → click one project (or create one).
- Note the URL: `.../projects/[PROJECT_ID]`.

### 3. Open terminal for this project

- On project overview, click **“Open terminal for this project”**.
- Confirm URL: `.../dashboard/terminal?projectId=[PROJECT_ID]`.
- Confirm title: **“G.R.I.P. Terminal — [Project Name]”.**

### 4. Run these commands in order (in the GRIP terminal)

```bash
npm install lodash
```

```bash
npm install --save-dev typescript
```

```bash
npm install
```

- Each should complete with “added N package(s)…” or “up to date, audited …”.

### 5. Check package.json in the app

- Go back to **Project** (overview or Repo/Files).
- Open **package.json** (root).
- It should contain `lodash` in `dependencies` and `typescript` in `devDependencies`.

### 6. Test chat scroll and shell hint

- Open **Develop** (enhanced chat) for the same project.
- Send: **“What npm command would add axios?”**
- In the reply: find the shell block, check **“Run in app terminal”** and **Copy** toast.
- Scroll up, leave the page, then return to the same chat → view should jump to **last message**.

---

## Part 6: Vercel Behavior (Optional)

**Goal:** When running on Vercel, installs still work in DB; run/build don’t run on disk.

### Option A – Deploy to Vercel and test

1. Deploy GRIP to Vercel (e.g. connect repo, deploy).
2. Open a project and **“Open terminal for this project”**.
3. Welcome text should say **“GRIP is running on Vercel”** and that installs update package.json in the DB.
4. Run `npm install lodash` in that terminal → should still show “added 1 package…” and package.json in the project should update (no real `node_modules` on Vercel).

### Option B – Simulate Vercel locally (advanced)

- Set `VERCEL=1` in your env and restart `npm run dev`.
- Open project terminal: you should see the Vercel message and DB installs still working; `npm run dev` would not run on disk.

---

## Quick Checklist

| What to test              | Where                | Command / action                         | Expected result                          |
|---------------------------|----------------------|------------------------------------------|-----------------------------------------|
| Scroll to last message    | Enhanced chat         | Leave chat, come back                    | View at bottom, last message visible    |
| Shell “Run in app terminal” | Enhanced chat       | Ask for npm install, copy block          | Hint + toast about GRIP terminal        |
| Project terminal title    | Terminal             | “Open terminal for this project”         | “G.R.I.P. Terminal — [Project Name]”    |
| DB install (one pkg)       | Project terminal     | `npm install lodash`                     | “added 1 package…”, package.json updated |
| DB install (dev)          | Project terminal     | `npm install --save-dev typescript`      | “added 1 package…”, devDep in JSON      |
| DB install (no args)      | Project terminal     | `npm install`                            | “up to date, audited X packages…”       |
| package.json in app        | Project files / Repo | Open package.json                        | Contains lodash, typescript, etc.        |

Use this guide to run through the flows and confirm everything works as designed.
