# Database: Tokenomics, Admin Portal, User Tiers & Settings

This document describes how MongoDB stores and handles tokenomics, the admin portal, user tiers, and app settings (including all newly added token/subscription features).

---

## 1. Collections overview

| Collection | Purpose |
|------------|--------|
| **users** | Auth (email/password, OAuth), subscription/tier, token usage per period |
| **app_settings** | Global app config: token limits for admin and valued testers |
| **valued_testers** | List of valued testers (email, token allowance); soft-delete via `removedAt` |
| **revenue_events** | Stripe subscription_started and invoice_paid events for revenue/reports |
| **admin_activity_log** | Audit log for admin actions (valued testers, payouts, announcements, app-updates) |
| **usersettings** | User preferences (theme, notifications, etc.); schema in `lib/mongodb.ts` ensureCollections |

All use the same database: `process.env.MONGODB_DB_NAME || 'test'`. Auth and register must use this same DB (see `src/app/api/auth/register/route.ts` and `src/lib/access.ts`).

---

## 2. Tokenomics (how tokens are stored and used)

### 2.1 Where token data lives

- **Per-user (paid or valued tester)**  
  Stored on the **users** document:
  - `tokenAllowance` – number of tokens allowed for the current period (set by Stripe tier or valued-tester config).
  - `tokensUsedThisPeriod` – count of tokens consumed this period (incremented by `addTokenUsage()`).
  - `subscriptionPeriodEnd` – end of current billing/allowance period (used for reset and “resets at” UI).

- **Global limits (admin & valued testers)**  
  Stored in **app_settings** in a single document:
  - `_id: 'token_limits'`
  - `adminTokenAllowance` – monthly token cap for admin users (default 500,000).
  - `valuedTesterTokenAllowance` – default monthly tokens per valued tester (default 50); can be overridden per tester in **valued_testers**.

### 2.2 How token limits are read

- **getTokenLimits()** (`src/lib/tokenUsage.ts`)  
  Reads `app_settings` document with `_id: 'token_limits'`. If missing, returns defaults (500k admin, 50 valued tester).

- **getAppAccess()** (`src/lib/access.ts`)  
  For each request it:
  1. Loads the **users** document by `session.user.id`.
  2. Calls `getTokenLimits()` for admin/valued-tester allowances.
  3. Resolves access and token numbers by tier (admin → subscription → valued tester → deny).

So:
- **Admins:** allowance comes from `app_settings.token_limits.adminTokenAllowance`; period/reset logic can sync fields on the **users** document (e.g. `subscriptionPeriodEnd`, `tokenAllowance`, `tokensUsedThisPeriod`).
- **Subscribers:** allowance and period come from **users** (set by Stripe webhook).
- **Valued testers:** allowance from **valued_testers** (or default from `app_settings`); usage and period are synced to **users** for a single source of truth.

### 2.3 How usage is written

- **addTokenUsage(userId, amount)** (`src/lib/tokenUsage.ts`)  
  Runs on the **users** collection:
  - `$inc: { tokensUsedThisPeriod: amount }`
  - `$set: { updatedAt: new Date() }`

All token-consuming routes (chat, enhanced-chat, projects create/analyze, etc.) call this after a successful AI request.

### 2.4 Period reset

- **Paid subscriptions:** Stripe webhook on `invoice.paid` sets `tokensUsedThisPeriod: 0` and updates `subscriptionPeriodEnd` and `tokenAllowance` for the new period.
- **Admins / valued testers:** Reset logic is in `getAppAccess()`: if `subscriptionPeriodEnd` is missing or in the past, it updates the user doc with a new period (end of current month) and, for admins/valued testers, sets `tokenAllowance` and optionally resets `tokensUsedThisPeriod`.

---

## 3. User tiers and access

Access is computed in **getAppAccess()** (and never throws; see `src/lib/access.ts`). Order of resolution:

1. **Admin**  
   - Determined by **session** (role set in auth session callback from **users** or `ADMIN_EMAILS`).  
   - **users** document: can have `role: 'admin'` or `isAdmin: true` (set manually in DB or by your own tooling).  
   - Session callback also grants admin if `session.user.email` is in `ADMIN_EMAILS` (env comma-separated list).  
   - Token allowance: from `app_settings.token_limits.adminTokenAllowance`.

2. **Paid subscription**  
   - **users** document must have:
     - `stripeSubscriptionId` (set by Stripe webhook)
     - `subscriptionPeriodEnd` > now
   - Tier and allowance come from **users**: `tier` (e.g. `starter` / `pro` / `team`), `tokenAllowance`, `tokensUsedThisPeriod`, `subscriptionPeriodEnd`.  
   - All of these are written/updated by the **Stripe webhook** (checkout completed, subscription updated/deleted, invoice.paid).

3. **Valued tester**  
   - **valued_testers** collection: document with matching `email` and `removedAt: null`.  
   - Allowance: document’s `tokenAllowance` or, if missing, `app_settings.token_limits.valuedTesterTokenAllowance`.  
   - **getAppAccess()** syncs allowance and period to the **users** document so usage is tracked in one place.

4. **No access**  
   - No admin, no active subscription, no valued tester → `hasAccess: false`; user is redirected to `/plans` (e.g. to complete Stripe checkout).

---

## 4. Users collection shape (relevant fields)

- **Auth:** `_id` (ObjectId), `email`, `password` (hashed for credentials), `name`, `createdAt` (and OAuth fields if using GitHub etc.).
- **Admin:** `role: 'admin'` or `isAdmin: true` (optional; can rely only on `ADMIN_EMAILS`).
- **Subscription (Stripe):**  
  `stripeSubscriptionId`, `tier`, `tokenAllowance`, `tokensUsedThisPeriod`, `subscriptionPeriodEnd`, `updatedAt`.
- **Valued tester:** Same token fields; they are synced from **valued_testers** + `app_settings` when **getAppAccess()** runs.

On subscription cancel/unpaid, the webhook **$unset**s: `stripeSubscriptionId`, `tier`, `tokenAllowance`, `subscriptionPeriodEnd` (and leaves `tokensUsedThisPeriod` as-is or it gets overwritten on next valued-tester sync).

---

## 5. Admin portal – what the database stores

- **Token limits**  
  - **app_settings** `_id: 'token_limits'`: `adminTokenAllowance`, `valuedTesterTokenAllowance`, `updatedAt`.  
  - Admin UI: `/dashboard/admin/token-limits` → GET/PATCH `/api/admin/token-limits` → `getTokenLimits()` / `setTokenLimits()`.

- **Valued testers**  
  - **valued_testers**: `email`, `name`, `tokenAllowance`, `addedAt`, `addedBy` (userId), `removedAt`, `removedBy`.  
  - Add: POST `/api/admin/valued-testers` (insert + log).  
  - Remove: DELETE (soft-delete: set `removedAt`, `removedBy`).  
  - Max 10 active (`removedAt: null`).

- **Revenue & reports**  
  - **revenue_events**: each doc has `type` (`subscription_started` | `invoice_paid`), `userId`, `stripeSubscriptionId`, `tier`, `amountCents`, `stripeInvoiceId` (for invoice_paid), `createdAt`.  
  - Written by Stripe webhook.  
  - Admin revenue/reports pages read from this collection (e.g. filter by `invoice_paid` and `subscription_started`).

- **Activity log**  
  - **admin_activity_log**: `action`, `userId`, `details`, `createdAt`.  
  - Used for: valued_tester add/remove, payouts, announcements, app-updates, etc.  
  - Activity log page reads this collection.

- **Users list**  
  - Admin “Users” page reads from **users** (and any stats from **projects** or other collections as implemented).

Other admin features (announcements, app-updates, support, payouts, settings) use their own APIs; some write to **admin_activity_log**. Settings (e.g. tax, password) may be in **app_settings** or env; see `/dashboard/admin/settings` and related API routes.

---

## 6. Settings (app-wide and admin)

- **app_settings**  
  - `_id: 'token_limits'`: token limits (see above).  
  - Other keys can be added for global config (e.g. feature flags, tax rate, public app settings).  
  - Access: server-side only (e.g. `getTokenLimits()` / `setTokenLimits()` and admin APIs).

- **usersettings**  
  - Per-user preferences (theme, notifications, etc.); schema and creation in `lib/mongodb.ts` ensureCollections.  
  - Not covered in detail here; used for user-facing preferences, not tokenomics or admin.

- **Admin “Settings”**  
  - Under `/dashboard/admin/settings` (tax, password, etc.).  
  - May read/write **app_settings** or env-backed config; see the settings API and page for exact fields.

---

## 7. Stripe webhook – what gets written to the database

- **checkout.session.completed**  
  - **users**: `$set` `stripeSubscriptionId`, `tier`, `tokenAllowance`, `tokensUsedThisPeriod: 0`, `subscriptionPeriodEnd`, `updatedAt`.  
  - **revenue_events**: insert `subscription_started` with `userId`, `stripeSubscriptionId`, `tier`, `amountCents`, `createdAt`.

- **customer.subscription.updated** / **customer.subscription.deleted**  
  - If canceled/unpaid: **users** `$unset` subscription/tier/token fields (and `$set updatedAt`).  
  - If still active: **users** `$set` `tier`, `tokenAllowance`, `subscriptionPeriodEnd`, `updatedAt`.

- **invoice.paid**  
  - **users**: `$set` `tokensUsedThisPeriod: 0`, `tokenAllowance`, `subscriptionPeriodEnd`, `updatedAt` (new period).  
  - **revenue_events**: insert `invoice_paid` with `userId`, `stripeSubscriptionId`, `stripeInvoiceId`, `amountCents`, `createdAt`.

Tier and token amounts come from `lib/stripe.ts` (TIERS / getTierByPriceId) using Stripe price IDs from env.

---

## 8. Summary diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MongoDB (DB: MONGODB_DB_NAME || 'test')                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  users                                                                   │
│    _id, email, password?, name, createdAt                                │
│    role?, isAdmin?              ← admin (or ADMIN_EMAILS in session)      │
│    stripeSubscriptionId, tier, tokenAllowance, tokensUsedThisPeriod,     │
│    subscriptionPeriodEnd, updatedAt  ← subscription + tokenomics         │
├─────────────────────────────────────────────────────────────────────────┤
│  app_settings                                                            │
│    { _id: 'token_limits', adminTokenAllowance, valuedTesterTokenAllowance }│
├─────────────────────────────────────────────────────────────────────────┤
│  valued_testers   (email, name, tokenAllowance, addedAt, removedAt…)    │
│  revenue_events   (type, userId, amountCents, stripeSubscriptionId…)     │
│  admin_activity_log  (action, userId, details, createdAt)                │
│  usersettings     (userId, profile, preferences…)                        │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
   getAppAccess()      getTokenLimits()        Stripe webhook
   addTokenUsage()     setTokenLimits()        Admin APIs
```

This is how the database stores and handles tokenomics, admin portal, user tiers, and settings with the current and newly added behavior.
