# Admin stats and enhancement progress

## Build statistics

- **Source:** Real data from MongoDB `BuildLog` collection.
- **API:** `GET /api/admin/stats/builds` — aggregates by `status` (running, completed, failed, pending, cancelled).
- **Fallback:** When there are no build logs in the database (`stats.total === 0`), the API returns placeholder counts (e.g. total: 12, running: 2, completed: 8, failed: 1) so the admin dashboard can show something in dev or empty DBs. As soon as real `BuildLog` documents exist, all numbers are live.
- **Where shown:** Admin dashboard overview (`/dashboard/admin`) and Build Monitor page (`/dashboard/admin/builds`). The Build Monitor page also derives counts from the list of builds returned by `/api/admin/builds` (same real data).

## Terminal statistics

- **Source:** Real data from MongoDB `TerminalSession` collection.
- **API:** `GET /api/admin/stats/terminals` — aggregates by `status` (active, inactive, error).
- **Fallback:** When there are no terminal sessions (`stats.total === 0`), the API returns placeholder counts (e.g. total: 5, active: 2, inactive: 3) for dev/demo. With real `TerminalSession` documents, numbers are live.
- **Where shown:** Admin dashboard overview only.

## Enhancement progress (G.R.I.P. Enhancement Plan)

- **What it is:** The “G.R.I.P. Enhancement Progress” section listing phases (Database Integration, Context Enhancement, Chat Interface Enhancement, etc.) and their status (Completed / In Progress).
- **Where it is shown:** Only on the **admin dashboard** page: `/dashboard/admin`. It is not shown on the main dashboard or to non-admin users.
- **Who sees it:** Only users who can access the admin area. Access is controlled by your app (e.g. route protection or role checks for `/dashboard/admin`). If only admins can open that URL, only admins see this section.
- **Status:** Phases 1–9 are marked **Completed** for deployment readiness. Chat Interface Enhancement and Testing and Integration are included as completed.
