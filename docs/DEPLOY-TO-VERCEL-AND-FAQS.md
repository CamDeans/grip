# Deploy to Vercel – flow, FAQs, and instructions

This doc covers how the **Deploy to Vercel** flow works in GRIP, and FAQs for both developers and non-developers.

---

## What “Deploy to Vercel” does

When you click **Deploy to Vercel** in GRIP (project overview or Preview):

1. GRIP uses your project’s **GitHub repo** (either the repo you linked in project settings, or the repo created by **Export to GitHub**).
2. GRIP calls Vercel’s API to start a **production deployment** from that repo.
3. Vercel builds and hosts your app and gives you a live URL (e.g. `https://your-project.vercel.app`).
4. GRIP saves that URL on the project so you can open it from the project or Preview page.

**Requirements:**

- The project must have a **GitHub repo**: either you linked one in project settings, or you used **Export to GitHub** (Preview) to create one.
- **Vercel** must know about that repo. That usually means the repo was **imported** in the Vercel dashboard (or connected via Vercel’s GitHub integration) at least once.
- The **server** running GRIP must have `VERCEL_TOKEN` set (see [VERCEL-DEPLOYMENT-ENV.md](./VERCEL-DEPLOYMENT-ENV.md)). Users do not set this; an admin does.

---

## Instructions for developers

1. **Get your project on GitHub**  
   - Link an existing repo in **Project → Settings → Repository**, or  
   - Use **Preview → Export to GitHub** to create a new repo from GRIP’s files.

2. **Connect the repo to Vercel (one-time per repo)**  
   - Go to [vercel.com](https://vercel.com) and sign in (GitHub is fine).  
   - **Add New… → Project** and **Import** the GitHub repo (`owner/repo-name`).  
   - You can leave default settings and deploy once, or skip the first deploy—Vercel just needs the project to exist and be connected.

3. **Deploy from GRIP**  
   - Open the project in GRIP → **Overview** or **Preview**.  
   - Click **Deploy to Vercel**.  
   - GRIP triggers a production deployment. When it’s ready, the live URL appears (and is saved on the project).  
   - If you see an error: the repo may not be imported in Vercel yet, or the server may not have `VERCEL_TOKEN` set.

4. **Optional: Vercel Token (for “Deploy to Vercel” from GRIP)**  
   - The **Deploy to Vercel** button in GRIP uses a **server-side** token (`VERCEL_TOKEN`), not your personal Vercel login.  
   - If you self-host GRIP: create a token at [Vercel → Settings → Tokens](https://vercel.com/account/tokens) and set `VERCEL_TOKEN` in the server environment.  
   - If you use a hosted GRIP: the admin should have already set `VERCEL_TOKEN`.

---

## Instructions for non-developers

1. **Get your project on GitHub**  
   - In GRIP, open your project and go to the **Preview** tab.  
   - Under **Export to GitHub**, follow “How to get your project on GitHub (devs & non-devs)” if you need a GitHub account and token.  
   - Click **Create new repo on GitHub**.  
   - After that, your project has a GitHub repo (link shown on the page).

2. **Connect the repo to Vercel (one-time per project)**  
   - Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).  
   - Click **Add New… → Project**.  
   - Find and **Import** the repository you just created (same name as in GRIP).  
   - Click through the import; you can use the default options.  
   - Once the project exists in Vercel, you don’t have to do this again for that repo.

3. **Deploy from GRIP**  
   - In GRIP, open your project → **Overview** or **Preview**.  
   - Click **Deploy to Vercel**.  
   - Wait a moment; when the deployment is ready, a **Live** link will appear. Click it to open your app.  
   - If the button is disabled, make sure you’ve done **Export to GitHub** first. If you see an error, the repo might not be imported in Vercel yet—go to Vercel and import it (step 2).

---

## FAQs

### Do I need more than one GitHub token if I have multiple projects?

**No.** You need **one GitHub Personal Access Token** per **user** (your GRIP account).  
That token is used for **Export to GitHub** for **all** your projects. You do **not** need a separate token per project.

- Set it once in **Dashboard → Settings** (GitHub Personal Access Token) or in **Project → Settings → Repository** (same token).
- Use a token with **repo** scope so GRIP can create and push to repos on your behalf.

---

### Why is “Deploy to Vercel” disabled?

The button is enabled only when the project has a **GitHub repo**:

- You linked a repo in **Project → Settings → Repository**, or  
- You used **Export to GitHub** on the **Preview** tab.

If you haven’t exported yet, do **Export to GitHub** first, then **Deploy to Vercel**.

---

### I clicked Deploy to Vercel and got an error. What do I do?

Common causes:

1. **Repo not connected to Vercel**  
   Go to [vercel.com](https://vercel.com) → **Add New… → Project** → **Import** the same GitHub repo (owner/repo name). Then try **Deploy to Vercel** again in GRIP.

2. **Server missing Vercel token**  
   The message may say Vercel is not configured. **VERCEL_TOKEN** must be set in the **server** environment (see [VERCEL-DEPLOYMENT-ENV.md](./VERCEL-DEPLOYMENT-ENV.md)). If you’re not the admin, ask them to add it.

3. **Wrong branch**  
   GRIP deploys from the **main** branch of the repo. If your code is on another branch, push it to `main` (or ask an admin to change the deploy route to use a different ref).

---

### Is the GitHub token the same as “Export to GitHub”?

Yes. The **GitHub Personal Access Token** you set in **Dashboard → Settings** (or Project Settings) is what GRIP uses when you click **Create new repo on GitHub** (Export to GitHub).  
One token per user, for all projects.

---

### Who sets the Vercel token?

**VERCEL_TOKEN** is a **server** environment variable. It is set by whoever runs the GRIP server (you on your own machine, or your admin for a hosted GRIP).  
Users do **not** enter a Vercel token in GRIP; the **Deploy to Vercel** button uses the server’s token to talk to Vercel’s API.

---

## Summary

| Step | Who | What |
|------|-----|------|
| GitHub token | You (once) | Dashboard → Settings (or Project → Settings) → GitHub Personal Access Token. One token for all projects. |
| Export to GitHub | You (per project) | Preview → Export to GitHub → Create new repo. |
| Import repo in Vercel | You (once per repo) | vercel.com → Add New → Project → Import the repo. |
| Deploy to Vercel | You (per deploy) | Project Overview or Preview → Deploy to Vercel. |
| VERCEL_TOKEN | Admin | Server env; see VERCEL-DEPLOYMENT-ENV.md. |
