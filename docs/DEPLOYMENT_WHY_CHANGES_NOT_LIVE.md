# Why changes work in dev but don’t appear when “live” (e.g. after push to GitHub)

If the flow works locally but the live site (e.g. Vercel) still shows the old behavior, work through these in order.

---

## 1. **Are you pushing the branch that actually deploys?**

- **Vercel** (and most hosts) deploy one branch as “Production” (usually `main` or `master`).
- If you push to `develop` or a feature branch, Production won’t update until that branch is merged into the deploy branch (or you change the “Production Branch” in the host).

**Check:**

- Which branch did you push? (`git branch` / GitHub)
- In Vercel: **Project → Settings → Git → Production Branch**. It must match the branch you push to for production to update.

**Fix:** Merge your changes into the production branch (e.g. `main`) and push, or push directly to that branch.

---

## 2. **Are all your changes committed and pushed?**

If some files weren’t committed, the host only has the old version of those files.

**Check:**

```bash
git status
git log -1 --name-only
```

Confirm that the files you changed (e.g. `LandingPage.tsx`, `get-started/page.tsx`, `plans/page.tsx`) are in the latest commit and that commit is pushed.

**Fix:** Add, commit, and push the missing files:

```bash
git add src/components/landing/LandingPage.tsx src/app/get-started/ src/app/plans/page.tsx  # etc.
git commit -m "Landing: fix Sign in / Get started links and reduce CTAs"
git push origin main
```

(Use your real branch name instead of `main` if different.)

---

## 3. **Did the production build succeed?**

If the build fails on the host, it keeps serving the **last successful** deployment. So you can push new code but still see old behavior.

**Check:**

- **Vercel:** Project → **Deployments** → open the latest deployment → check **Building** / **Ready** / **Error** and the build logs.
- **GitHub Actions:** If you use a workflow that deploys, check the workflow run for that push (e.g. `.github/workflows/build.yml`).

**Fix:** Fix whatever the build logs say (missing env, TypeScript/lint errors, etc.), then push again so a new build runs and succeeds.

---

## 4. **Cache: build cache or CDN**

The host or CDN might be serving an old build or old assets.

**Check / Fix:**

- **Vercel:** Deployments → open the latest deployment → **⋯** → **Redeploy** → enable **“Clear build cache and redeploy”** (or similar), then redeploy.
- **Vercel:** Project → **Settings** → **General** → confirm **Build Command** and **Output Directory** are what you expect (e.g. `next build`, `.next` for Next.js).

After a clean redeploy, wait for the build to finish and check the live URL again.

---

## 5. **Browser cache**

Your browser might be using cached JS/CSS, so the “live” site looks old even though the deployment is new.

**Check:** Open the live site in an **Incognito/Private** window or do a **hard refresh** (e.g. Ctrl+Shift+R / Cmd+Shift+R). If it’s correct there, the deployment is fine and it was browser cache.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Push (and merge if needed) to the **production branch** (e.g. `main`). |
| 2 | Ensure **all** changed files are in that commit and pushed. |
| 3 | In Vercel (or your host), confirm the **latest deployment** is from that commit and that the **build succeeded**. |
| 4 | If needed, **Redeploy with “Clear build cache”**. |
| 5 | Test the live URL in **Incognito** or after a hard refresh. |

If you do all of the above and the live site still doesn’t match dev, the next step is to compare the exact commit SHA that the host reports for the live deployment with the SHA of your latest commit on the production branch.
