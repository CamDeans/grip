# GRIP — Persistence & Progress

## What is saved so you don’t lose progress

### 1. Chat history

- **Where:** MongoDB `chatHistory` collection (database: `test`), keyed by `projectId`.
- **When:** Every user message and every GRIP reply in the **Develop** (enhanced) chat is saved by the `/api/enhanced-chat` route.
- **When you return:** Opening a project’s **Develop** tab loads history via `GET /api/chat/history?projectId=...`. The provider calls this on mount, so when you leave and come back, your conversation is restored.

**Important:** Chat is read and written in the same DB (`test`). If you use a different DB name elsewhere, ensure enhanced-chat and chat/history use the same one.

### 2. Build logs

- **Where:** MongoDB `buildLogs` collection (or Mongoose `BuildLog` model when used), keyed by `projectId` and `taskId`.
- **When:** When a task/build runs (e.g. via task worker or project automation), logs are created and updated (output, status, end time).
- **When you return:** Build logs are fetched by project:
  - **Develop** tab context: last few logs via `/api/build-logs?projectId=...`
  - **Admin → Builds:** full list and detail via `/api/admin/buildlogs` and related admin APIs.

### 3. Task progress (active / recent tasks)

- **Where:** MongoDB tasks store (e.g. `Task` model / tasks collection), keyed by `projectId`.
- **When:** When tasks are queued, started, completed, or failed, their status is persisted.
- **When you return:** The **Develop** tab’s task progress indicator calls `GET /api/projects/[id]/tasks/active` and shows active (and optionally recent) tasks. So when you come back, you see what’s running or last ran.

### 4. Project and plan

- **Where:** MongoDB `projects` and related collections (e.g. analyses, plan, repo context).
- **When:** Created/updated when you create or edit the project, run analysis, or generate a plan.
- **When you return:** Overview, Repo, Plan, and Settings all load from these stores, so project state and plan are still there.

---

## How to see “what happened” and “what’s left to do”

| Goal | Where to look |
|------|----------------|
| **What was said in chat** | Open the project → **Develop** tab. Full conversation is loaded from saved chat history. |
| **What’s running or recently ran (tasks)** | Same project → **Develop** tab. Use the **task progress** area (e.g. “N active tasks”); it uses `/api/projects/[id]/tasks/active`. |
| **Build output and status** | **Develop** tab (recent build context) or **Admin → Builds** (all build logs for the app). |
| **What’s left to do (plan)** | Open the project → **Plan** tab. The plan and tasks are stored per project; reopen the plan to see remaining work. |
| **High-level project status** | **Overview** tab: completion status (draft / ready to export / exported / deployed), repo link, and “See it run & ship it” actions. |

---

## Implementation notes

- **Chat:** Enhanced-chat route uses `client.db('test')` for both project/analysis read and `saveChatMessage`. GET `/api/chat/history` uses `getChatHistory(projectId)`, which reads from `chatHistory` in `test` and returns normalized messages (`id`, `role`, `content`, `timestamp`).
- **History load:** `EnhancedChatProvider` runs `loadChatHistory()` on mount (when `projectId` is set). If the API returns one or more messages, it sets them; if it returns none, it leaves the current state (e.g. welcome message) so the UI isn’t cleared unnecessarily.
- **Tasks:** `TaskProgressIndicator` fetches `/api/projects/[id]/tasks/active` so task progress is restored when you re-open the project.
- **Build logs:** Fetched by project where needed; no special “restore” step—just open the project or admin builds to see them.

---

## Optional improvements

- **Overview “Recent activity”:** Add a section on the project Overview that shows “Last N chat messages” or “Last task run” by calling chat history (last N) and/or tasks active API, so “what happened” is visible without opening Develop.
- **Plan “Done vs left”:** On the Plan tab, explicitly show counts or labels for “completed” vs “pending” tasks so “what’s left to do” is obvious at a glance.
