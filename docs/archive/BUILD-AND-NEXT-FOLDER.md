# Build Issues & .next Folder

## Why you can't delete the `.next` folder

**The Next.js dev server (`npm run dev`) keeps files inside `.next` open.** On Windows, any process that has an open handle to a file or folder prevents you from deleting it.

- If **`npm run dev` is running** (e.g. in a terminal), that process is using `.next` for cache and compiled output.
- **Fix:** Stop the dev server first:
  1. Switch to the terminal where `npm run dev` is running.
  2. Press **Ctrl+C** to stop it.
  3. Then you can delete `.next` (e.g. in File Explorer, or run `Remove-Item -Recurse -Force .next` in PowerShell from the project root).

## Why `npm run build` might not work as expected

1. **Dev and build both use `.next`**  
   If you run `npm run build` while `npm run dev` is running, they can conflict (file locks, partial writes). The build may hang, fail with `EPERM`, or get interrupted.

2. **Build was interrupted**  
   Exit code 130 usually means the process was stopped (e.g. Ctrl+C). If the build takes a long time, it might have been cancelled before finishing.

3. **Stale or corrupted `.next`**  
   After fixing the above, a clean build often helps.

## Recommended steps for a clean build

1. **Stop the dev server**  
   In the terminal where `npm run dev` is running, press **Ctrl+C**.

2. **Remove the `.next` folder** (optional but recommended for a clean build):
   - **PowerShell:** `Remove-Item -Recurse -Force .next`
   - **Git Bash / MINGW64:** `rm -rf .next`
   - Or delete the `.next` folder in File Explorer.

3. **Run the build:**
   ```bash
   npm run build
   ```

4. **If the build hangs** (no new output for several minutes):
   - Make sure no other `node` or `next` process is still running (Task Manager → Details → end any `node.exe` for this project).
   - Try again after deleting `.next` and running `npm run build` once.

## Summary

| Issue | Cause | Fix |
|-------|--------|-----|
| Can't delete `.next` | `npm run dev` (or another Node process) has files open | Stop dev (Ctrl+C), then delete `.next` |
| Build hangs or fails | Dev server still running, or corrupted `.next` | Stop dev → delete `.next` → run `npm run build` |
