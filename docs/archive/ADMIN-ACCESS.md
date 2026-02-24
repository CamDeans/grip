# Admin access: how the app knows who is admin

## How admin is determined

The app treats a user as **admin** if **any** of the following is true:

1. **Database:** The user document in MongoDB `users` has:
   - `role === 'admin'`, or  
   - `isAdmin === true`  
   (NextAuth adapter stores users in `users`; you can add/update these fields manually or via a script.)

2. **Environment:** The user’s **email** (from the session) is in the `ADMIN_EMAILS` env variable.  
   - Format: comma-separated, e.g. `ADMIN_EMAILS=you@example.com,other@example.com`  
   - Comparison is case-insensitive and trims whitespace.  
   - No DB change needed: same sign-in flow as a regular user; if their email is in `ADMIN_EMAILS`, they get admin.

So when you “just registered and signed in using the same method as a regular user,” the app knows you’re admin **only if**:

- Your email is listed in `ADMIN_EMAILS` in `.env.local` (or Vercel env), **or**
- Your user in the `users` collection has `role: 'admin'` or `isAdmin: true`.

If neither is set, **no one** is admin (all `isAdminUser()` checks fail).

## What’s in place to prevent non-admins from seeing admin content

1. **Session:** On every request that uses the session, the auth `session` callback loads the user from the DB (or checks `ADMIN_EMAILS`) and sets `session.user.role = 'admin'` when applicable. So the session is the single source of truth for “is this user admin?”

2. **Admin UI (dashboard):**  
   - The **admin layout** (`/dashboard/admin/layout.tsx`) uses `useSession()` and `isAdminUser(session)`.  
   - If the user is not logged in → redirect to `/login`.  
   - If the user is logged in but **not** admin → redirect to `/dashboard`.  
   - So non-admin users never see admin pages; they are redirected before any admin content is shown.

3. **Admin API routes:**  
   - Every admin API under `/api/admin/*` first checks `getServerAuthSession()`.  
   - If there is no session → `401 Unauthorized`.  
   - Then they check `isAdminUser(session)`.  
   - If the user is not admin → `403 Forbidden - Admin access required`.  
   - So non-admin users cannot call admin APIs successfully; they get 403 and no admin data.

## Summary

- **How does the app know I am admin?**  
  Either your email is in `ADMIN_EMAILS`, or your `users` document has `role: 'admin'` or `isAdmin: true`. Same sign-in; admin is resolved in the session callback.

- **What prevents non-admins from seeing admin stuff?**  
  Admin layout redirects non-admins away from `/dashboard/admin`, and every admin API returns 403 for non-admins. Only users who pass `isAdminUser(session)` can see admin UI or use admin APIs.
