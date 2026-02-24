# Full GRIP Build — Requirements & Checklist

GRIP is a **100% functioning app** that creates and deploys full projects. No "future" builds; this is the full build.

## Required Capabilities

| # | Capability | Status | Notes |
|---|------------|--------|--------|
| 1 | **Export to GitHub** | Done | Full project (repo + projectFiles); export enabled when repo or generated files exist. |
| 2 | **Deploy to Vercel** | Done | POST `/api/projects/[id]/deploy`; `VERCEL_TOKEN` in .env.example; UI shows status and live URL. |
| 3 | **Preview** | Done | Preview tab: URL input + iframe; Open in StackBlitz (linked or exported repo); pre-fill and link to deployed URL. |
| 4 | **Full repo** | Done | Repo tab: full tree from `/api/projects/[id]/repo/tree` (no limit); search, view, edit. |
| 5 | **Chat → projectFiles** | Done | "Save to project" on each code block in enhanced chat; POST `/api/projects/[id]/files/save-from-chat`; appears in Generated files and export. |
| 6 | **Project completion flow** | Done | Status: Draft → Ready to export → Exported/Deployed; CTAs: Repo \| Preview \| Export \| Deploy. |

## Implementation Checklist

- [x] **Export**: Merge `projectFiles` with repo files; support export when no linked repo (projectFiles only). Export button enabled when repo or generated files exist.
- [x] **Deploy**: `VERCEL_TOKEN` in .env.example; deployment URL and status shown in overview; `refreshProject()` after deploy.
- [x] **Preview**: Preview tab with iframe, StackBlitz (linked or exported repo), and deployed URL pre-fill/link.
- [x] **Repo**: Full tree (no limit); full analysis via summarize; search and edit.
- [x] **Chat-to-files**: "Save to project" on code blocks in FormattedMessage; path/filename form; POST save-from-chat; create/update via fileStorageService; show in Generated files and export.
- [x] **Completion flow**: `completionStatus`; CTAs for Repo Explorer, Preview, Export, Deploy; Mark ready to export.

## Where the user sees combined repo + generated files

- **Repo tab → "Project (repo + yours)"**  
  One tree shows the **linked repo** and **your generated files** (saved from chat or Plan) in the same folder structure. Your files override the same path when both exist. Files you added are labeled **"Yours"**. You can view and edit both repo and generated files from this view.
- **Overview → Generated files**  
  Flat list of generated files (path/filename) with links to view/edit.
- **Export** pushes the full project (repo + generated) to a new GitHub repo; **Deploy** uses that or the linked repo.

## Restructuring and ownership

- **GRIP does not restructure** the original repo into a new folder layout. The **same folder structure** is kept; generated files are **overlaid** at their paths (e.g. `src/App.tsx`). Where both repo and generated have the same path, the generated version is used for display and export so **you have ownership** of your changes and new files without changing the repo’s layout.

## References

- Rules: `.cursorrules` → `full_grip_build`
- Vision: `docs/GRIP-VISION-AND-ROADMAP.md`
- Project tree (combined): `src/app/api/projects/[id]/project-tree/route.ts`
- Export: `src/app/api/projects/[id]/export/route.ts`
- Deploy: `src/app/api/projects/[id]/deploy/route.ts`
- Files: `src/lib/services/fileStorageService.ts` (`listProjectFiles`), `src/lib/repository.ts` (`getOrCloneRepository`)
