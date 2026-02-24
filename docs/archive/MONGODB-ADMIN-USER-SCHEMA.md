# MongoDB admin user schema

NextAuth stores users in the `users` collection (default database). To support admin access, you can add these fields to user documents.

## Optional fields on `users`

| Field     | Type    | Description |
|----------|---------|-------------|
| `role`   | string  | Set to `'admin'` for admin users. |
| `isAdmin`| boolean | Alternative: set to `true` for admin users. |
| `createdAt` | Date | Optional; used for "new this week" metrics when present. |

The auth session callback in `src/lib/auth.ts` checks:

1. **DB:** `user.role === 'admin'` or `user.isAdmin === true` → user is admin.
2. **Env:** If `ADMIN_EMAILS` (comma-separated) contains the user's email → user is admin.

So you can designate admins either by updating the DB or by setting `ADMIN_EMAILS` in `.env.local`.

## Making a user admin via MongoDB

1. **By email (recommended for first admin):**  
   Add your email to `ADMIN_EMAILS` in `.env.local`, e.g.  
   `ADMIN_EMAILS=your@email.com`  
   No DB change needed. Sign out and sign in again.

2. **By DB update:**  
   After the user has signed in at least once (so they exist in `users`):

   ```javascript
   // In MongoDB shell or Compass
   db.users.updateOne(
     { email: "admin@example.com" },
     { $set: { role: "admin" } }
   )
   ```

   Or set `isAdmin: true` instead of `role: 'admin'`.

## Admin sign-in portal

- **URL:** `/admin/login`  
- **Behavior:** Redirects unauthenticated users to `/login?callbackUrl=/dashboard/admin`. After login, they are sent to `/dashboard/admin`. The admin layout and APIs then enforce that only users with `session.user.role === 'admin'` (from DB or `ADMIN_EMAILS`) can access admin pages and data.

Non-admin users who sign in via this link will land on `/dashboard/admin` but are immediately redirected to `/dashboard` by the admin layout.
