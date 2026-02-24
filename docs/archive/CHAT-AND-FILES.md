# Chat vs project files — what’s saved and where to see it

## Is code from chat saved to the database as files?

**No.** Right now:

- **Chat** saves only **messages** (user + assistant) in the `chatHistory` collection.  
  So when GRIP suggests or pastes code in a message, that code lives **only inside the chat message text**. It is **not** written to the `projectFiles` collection or to repo files.
- **Project files** in the database (`projectFiles` collection) are filled by:
  - **Plan-based generation**: using **Plan** → “Generate files” (or the API `POST /api/projects/[id]/files/generate`), which uses the plan and templates and calls `createFile` in `fileStorageService`.
  - Any other code that explicitly calls `createFile` / `updateFile` (e.g. other tools or future “save from chat” flow).

So: **chat contains the code in the conversation; that code is not automatically saved to project files in the DB.** To get code “into” project files today, you either generate from the Plan or copy from chat and create/update files via some other path.

---

## Where can the user see “files” for a project?

There are two different notions of “files”:

### 1. **Repo files (cloned from GitHub)**

- **What:** The files from the linked GitHub repo, stored and exposed as the “repo” for the project.
- **Where to see:**  
  - **Repo** tab: project → **Repo**.  
  - Uses `/api/projects/[id]/repo/tree` and `/api/projects/[id]/repo/files` (browse and read/edit repo files).

### 2. **Generated project files (in the database)**

- **What:** Files created by GRIP (e.g. from Plan → Generate files), stored in the `projectFiles` collection.
- **Where to see:**  
  - **Project Overview**: “Generated files” section lists files from `/api/project-files?projectId=...` (path, filename, size; link to view content).  
  - **Admin → Builds**: the build logs view can include a **FileExplorer** that loads from `/api/admin/project-files?projectId=...`.  
  - **APIs:**  
    - `GET /api/project-files?projectId=...` — list (and optionally content) for a project.  
    - `GET /api/project-files/[id]` — single file by id.  
    - `GET /api/projects/[id]/files` — list of generated files for the project (from `fileGeneratorService.getGeneratedFiles`).

So: **created/updated “project files” (DB) are visible on the project Overview under “Generated files” and in Admin (e.g. Builds + FileExplorer).** Repo files are visible in the **Repo** tab.

---

## Summary

| Question | Answer |
|----------|--------|
| Is chat content (including code) saved? | Yes, as **chat messages** in `chatHistory`. |
| Is that code saved into project files in the DB? | **No.** Only message text is stored. |
| How do files get into `projectFiles`? | Plan-based “Generate files” (and any other code that calls `createFile` / `updateFile`). |
| Where do I see repo files? | **Repo** tab (cloned GitHub repo). |
| Where do I see generated project files? | **Overview** (“Generated files” section), **Admin → Builds** (FileExplorer), and the APIs above. |

A possible future improvement is to parse code blocks from GRIP’s replies (e.g. with optional path/filename) and call `createFile` / `updateFile` so that “files” created in chat are also saved to `projectFiles` and show up in “Generated files” and Admin.
